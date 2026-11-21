/*
  CRUD del inventario de GM-Activos.
  Solo el backend escribe la hoja de vida, las reservas y los cambios de estado.
*/

import Equipment from "../models/Equipment";
import EquipmentAssignment from "../models/EquipmentAssignment";
import EquipmentCategory from "../models/EquipmentCategory";
import EquipmentLocation from "../models/EquipmentLocation";
import EquipmentMaintenanceAttachment from "../models/EquipmentMaintenanceAttachment";
import EquipmentSubcategory from "../models/EquipmentSubcategory";
import { broadcast } from "../realtime";
import { catalogosPorTexto } from "../utils/equipmentCatalogSearch";
import { agregarEvento } from "../utils/equipmentHistory";
import { imagenABuffer } from "../utils/equipmentImage";
import { imagenDeEquipo } from "../utils/equipmentImages";
import {
  esObjectIdValido,
  normalizarPlaca,
  textosRestricciones,
  validarEstadoCreacion,
  validarTransicionEstado,
} from "../utils/equipmentRules";
import {
  listarDisponibilidad,
  resumenGeneralEquipos,
} from "../utils/equipmentReservations";
import { custodiasActivasPorEquipo } from "../utils/equipmentCustody";
import {
  MAX_ADJUNTOS,
  calcularProgreso,
  normalizarAdjunto,
  normalizarAdjuntos,
  normalizarAvance,
  serializarAdjunto,
  tieneMantenimientoEnProceso,
} from "../utils/equipmentMaintenance";
import { listarSeguimientosPendientes } from "../utils/equipmentFollowups";
import {
  crearRegistroMantenimiento,
  estadoTextoEquipo,
} from "../utils/equipmentMaintenanceFlow";
import { serializarEquipo } from "../utils/equipmentSerializer";

const texto = (valor) => String(valor ?? "").trim();

const usuarioSesion = (req) =>
  req.usuario ?? {
    id: texto(req.headers["x-user-id"]),
    nombre: texto(req.headers["x-user-name"]) || "Administrador",
    rol: texto(req.headers["x-user-role"]),
  };

const estadoTexto = estadoTextoEquipo;

const normalizarListaTexto = (lista, campo = "texto") => {
  if (!Array.isArray(lista)) return [];

  return lista
    .map((item) =>
      typeof item === "string" ? item.trim() : texto(item?.[campo] ?? item?.texto)
    )
    .filter(Boolean);
};

const cargarEquipo = async (id, { incluirHistorial = true } = {}) => {
  const equipo = await Equipment.findById(id)
    .populate("categoriaId", "nombre descripcion imagen imagenMiniatura")
    .populate("subcategoriaId", "nombre descripcion imagen imagenMiniatura")
    .populate("ubicacionId", "nombre")
    .lean();

  if (!equipo) return null;

  const reservas = await EquipmentAssignment.find({
    equipoId: equipo._id,
    estado: "Activa",
  }).lean();

  const custodias = await custodiasActivasPorEquipo([String(equipo._id)]);
  const custodia = custodias[0]?.custodia ?? null;

  const adjuntos = await EquipmentMaintenanceAttachment.find({
    equipoId: equipo._id,
  })
    .sort({ createdAt: 1 })
    .lean();

  const adjuntosPorMantenimiento = {};
  const adjuntosPorPaso = {};
  adjuntos.forEach((adjunto) => {
    const serializado = serializarAdjunto(adjunto, String(equipo._id));
    const pasoId = String(adjunto.pasoId ?? "");

    if (pasoId) {
      if (!adjuntosPorPaso[pasoId]) adjuntosPorPaso[pasoId] = [];
      adjuntosPorPaso[pasoId].push(serializado);
      return;
    }

    const clave = String(adjunto.mantenimientoId ?? "");
    if (!clave) return;
    if (!adjuntosPorMantenimiento[clave]) {
      adjuntosPorMantenimiento[clave] = [];
    }
    adjuntosPorMantenimiento[clave].push(serializado);
  });

  return serializarEquipo(equipo, {
    reservas,
    custodia,
    incluirHistorial,
    incluirMantenimientos: true,
    adjuntosPorMantenimiento,
    adjuntosPorPaso,
  });
};

const buscarMantenimiento = (equipo, mantenimientoId) => {
  if (!esObjectIdValido(mantenimientoId)) return null;

  return (
    equipo.mantenimientos.id(mantenimientoId) ??
    equipo.mantenimientos.find(
      (item) => String(item._id) === String(mantenimientoId)
    ) ??
    null
  );
};

const buscarPaso = (mantenimiento, pasoId) => {
  if (!mantenimiento || !esObjectIdValido(pasoId)) return null;

  return (
    mantenimiento.pasos.id(pasoId) ??
    mantenimiento.pasos.find((item) => String(item._id) === String(pasoId)) ??
    null
  );
};

const buscarAdjunto = (equipoId, mantenimientoId, adjuntoId) => {
  if (
    !esObjectIdValido(equipoId) ||
    !esObjectIdValido(mantenimientoId) ||
    !esObjectIdValido(adjuntoId)
  ) {
    return null;
  }

  return EquipmentMaintenanceAttachment.findOne({
    _id: adjuntoId,
    equipoId,
    mantenimientoId,
  });
};

const normalizarId = (valor) => String(valor ?? "").trim();

const responderEquipo = async (res, id, status = 200) => {
  const serializado = await cargarEquipo(id);
  if (!serializado) {
    return res.status(404).json({ message: "El equipo no existe" });
  }
  return res.status(status).json(serializado);
};

/**
 * Comprobación en vivo de la placa mientras se escribe en el formulario.
 * No reemplaza la validación del alta: solo evita que el usuario llegue al
 * submit con una placa que ya existe.
 */
export const checkEquipmentPlate = async (req, res) => {
  try {
    const placa = texto(req.query.placa);
    const excluirId = texto(req.query.excluirId);

    if (!placa) {
      return res.status(400).json({ message: "La placa es obligatoria" });
    }
    if (placa.length > 80) {
      return res
        .status(400)
        .json({ message: "La placa no puede superar 80 caracteres" });
    }

    const filtro = { placaClave: normalizarPlaca(placa) };
    if (excluirId && esObjectIdValido(excluirId)) {
      filtro._id = { $ne: excluirId };
    }

    const existente = await Equipment.findOne(filtro)
      .select("_id placa")
      .lean();

    return res.json({
      placa,
      disponible: !existente,
      equipo: existente
        ? { id: String(existente._id), placa: existente.placa }
        : null,
    });
  } catch (error) {
    return res.status(500).json({
      message: error?.message || "No se pudo verificar la placa",
    });
  }
};

export const findEquipment = async (req, res) => {
  try {
    const filtro = {};
    const estado = texto(req.query.estado);
    const motivo = texto(req.query.motivoInactivo);
    const categoriaId = texto(req.query.categoriaId);
    const subcategoriaId = texto(req.query.subcategoriaId);
    const ubicacionId = texto(req.query.ubicacionId);
    const q = texto(req.query.q);
    const custodia = texto(req.query.custodia);

    if (estado) filtro.estado = estado;
    if (motivo) filtro.motivoInactivo = motivo;
    if (categoriaId && esObjectIdValido(categoriaId)) filtro.categoriaId = categoriaId;
    if (subcategoriaId && esObjectIdValido(subcategoriaId)) {
      filtro.subcategoriaId = subcategoriaId;
    }
    if (ubicacionId && esObjectIdValido(ubicacionId)) filtro.ubicacionId = ubicacionId;
    if (custodia === "1") filtro.custodiaActivaId = { $ne: null };
    if (custodia === "0") filtro.custodiaActivaId = null;

    if (q) {
      const busqueda = await catalogosPorTexto(q);

      if (busqueda) {
        filtro.$or = [
          { placa: busqueda.patron },
          { descripcion: busqueda.patron },
          { "observaciones.texto": busqueda.patron },
          { "restricciones.texto": busqueda.patron },
        ];

        // La descripción se hereda del catálogo: buscar "Forza" debe traer los
        // equipos de la subcategoría aunque no guarden ese texto.
        if (busqueda.idsSubcategoria.length > 0) {
          filtro.$or.push({ subcategoriaId: { $in: busqueda.idsSubcategoria } });
        }
        if (busqueda.idsCategoria.length > 0) {
          filtro.$or.push({ categoriaId: { $in: busqueda.idsCategoria } });
        }
      }
    }

    const equipos = await Equipment.find(filtro)
      .populate("categoriaId", "nombre descripcion imagen imagenMiniatura")
      .populate("subcategoriaId", "nombre descripcion imagen imagenMiniatura")
      .populate("ubicacionId", "nombre")
      .sort({ placa: 1 })
      .lean();

    const ids = equipos.map((equipo) => equipo._id);
    const [reservas, custodias] = await Promise.all([
      ids.length
        ? EquipmentAssignment.find({
            equipoId: { $in: ids },
            estado: "Activa",
          }).lean()
        : [],
      custodiasActivasPorEquipo(ids),
    ]);

    const porEquipo = new Map();
    reservas.forEach((reserva) => {
      const clave = String(reserva.equipoId);
      if (!porEquipo.has(clave)) porEquipo.set(clave, []);
      porEquipo.get(clave).push(reserva);
    });

    const custodiaPorEquipo = new Map(
      custodias.map((fila) => [String(fila.equipoId), fila.custodia])
    );

    res.json(
      equipos.map((equipo) =>
        serializarEquipo(equipo, {
          reservas: porEquipo.get(String(equipo._id)) ?? [],
          custodia: custodiaPorEquipo.get(String(equipo._id)) ?? null,
          incluirHistorial: false,
          incluirMantenimientos: false,
        })
      )
    );
  } catch (error) {
    res.status(500).json({
      message: error?.message || "No se pudo listar el inventario",
    });
  }
};

export const findEquipmentById = async (req, res) => {
  try {
    const serializado = await cargarEquipo(req.params.id);
    if (!serializado) {
      return res.status(404).json({ message: "El equipo no existe" });
    }
    res.json(serializado);
  } catch (error) {
    res.status(500).json({
      message: error?.message || "No se pudo consultar el equipo",
    });
  }
};

export const getEquipmentSummary = async (req, res) => {
  try {
    const resumen = await resumenGeneralEquipos();
    res.json(resumen);
  } catch (error) {
    res.status(500).json({
      message: error?.message || "No se pudo calcular el resumen del inventario",
    });
  }
};

export const getEquipmentAvailability = async (req, res) => {
  const {
    fechaClave,
    timeIn,
    timeOut,
    categoriaId,
    q,
    incluirNoDisponibles,
    excluirOrigenTipo,
    excluirOrigenId,
  } = req.query;

  if (!fechaClave || !timeIn || !timeOut) {
    return res.status(400).json({
      message: "Debes indicar fechaClave, timeIn y timeOut",
    });
  }

  try {
    const resultado = await listarDisponibilidad({
      fechaClave,
      timeIn,
      timeOut,
      categoriaId: texto(categoriaId),
      q: texto(q),
      incluirNoDisponibles:
        String(incluirNoDisponibles ?? "").toLowerCase() === "true",
      excluirOrigenTipo: texto(excluirOrigenTipo),
      excluirOrigenId: texto(excluirOrigenId),
    });

    if (resultado.error) {
      return res.status(400).json({ message: resultado.error });
    }

    res.json({
      resumen: resultado.resumen,
      equipos: resultado.equipos,
      intervalo: resultado.intervalo,
    });
  } catch (error) {
    res.status(500).json({
      message: error?.message || "No se pudo calcular la disponibilidad",
    });
  }
};

const validarCatalogos = async ({
  categoriaId,
  subcategoriaId,
  ubicacionId,
  exigirSubcategoria = true,
}) => {
  if (!esObjectIdValido(categoriaId)) {
    return { error: "Debes seleccionar una categoría válida" };
  }
  if (!esObjectIdValido(ubicacionId)) {
    return { error: "Debes seleccionar una ubicación válida" };
  }

  const [categoria, ubicacion] = await Promise.all([
    EquipmentCategory.findById(categoriaId).lean(),
    EquipmentLocation.findById(ubicacionId).lean(),
  ]);

  if (!categoria) return { error: "La categoría no existe" };
  if (!ubicacion) return { error: "La ubicación no existe" };
  if (!categoria.activo) return { error: "La categoría está desactivada" };
  if (!ubicacion.activo) return { error: "La ubicación está desactivada" };

  const subcategoriasActivas = await EquipmentSubcategory.countDocuments({
    categoriaId,
    activo: true,
  });

  let subcategoria = null;
  if (subcategoriaId) {
    if (!esObjectIdValido(subcategoriaId)) {
      return { error: "La subcategoría no es válida" };
    }

    subcategoria = await EquipmentSubcategory.findOne({
      _id: subcategoriaId,
      categoriaId,
    }).lean();

    if (!subcategoria) {
      return { error: "La subcategoría no pertenece a la categoría seleccionada" };
    }
    if (!subcategoria.activo) {
      return { error: "La subcategoría está desactivada" };
    }
  } else if (exigirSubcategoria && subcategoriasActivas > 0) {
    return {
      error: "Selecciona una subcategoría para esta categoría",
    };
  }

  return { categoria, subcategoria, ubicacion, error: null };
};

export const createEquipment = async (req, res) => {
  const body = req.body ?? {};
  const usuario = usuarioSesion(req);
  const placa = texto(body.placa);
  // La descripción técnica ya no se pide por equipo: se hereda de la
  // subcategoría. Solo se acepta como texto legado de respaldo.
  const descripcion = texto(body.descripcion);

  if (!placa) {
    return res.status(400).json({ message: "La placa es obligatoria" });
  }
  if (placa.length > 80) {
    return res.status(400).json({ message: "La placa no puede superar 80 caracteres" });
  }

  try {
    const catalogos = await validarCatalogos({
      categoriaId: texto(body.categoriaId),
      subcategoriaId: texto(body.subcategoriaId),
      ubicacionId: texto(body.ubicacionId),
    });
    if (catalogos.error) {
      return res.status(400).json({ message: catalogos.error });
    }

    const placaClave = normalizarPlaca(placa);
    if (await Equipment.exists({ placaClave })) {
      return res.status(409).json({
        message: `Ya existe un equipo con la placa "${placa}"`,
      });
    }

    const estadoInicial = validarEstadoCreacion({
      estado: body.estado,
      motivoInactivo: body.motivoInactivo,
    });
    if (!estadoInicial.ok) {
      return res.status(400).json({ message: estadoInicial.error });
    }

    const observaciones = normalizarListaTexto(body.observaciones).map((item) => ({
      texto: item,
      por: usuario.nombre,
      porId: usuario.id,
      creadoEn: new Date(),
    }));

    const restricciones = normalizarListaTexto(body.restricciones).map((item) => ({
      texto: item,
      por: usuario.nombre,
      porId: usuario.id,
      creadoEn: new Date(),
    }));

    const equipo = new Equipment({
      placa,
      placaClave,
      categoriaId: catalogos.categoria._id,
      subcategoriaId: catalogos.subcategoria?._id ?? null,
      ubicacionId: catalogos.ubicacion._id,
      descripcion,
      estado: estadoInicial.estado,
      motivoInactivo: estadoInicial.motivoInactivo,
      observaciones,
      restricciones,
      creadoPor: usuario.nombre,
      creadoPorId: usuario.id,
      actualizadoPor: usuario.nombre,
      actualizadoPorId: usuario.id,
    });

    agregarEvento(equipo, {
      tipo: "ingreso",
      titulo: "Equipo ingresado al inventario",
      detalle: [
        texto(catalogos.categoria.nombre),
        texto(catalogos.subcategoria?.nombre),
        placa,
      ]
        .filter(Boolean)
        .join(" · "),
      estadoNuevo: estadoTexto({
        estado: estadoInicial.estado,
        motivoInactivo: estadoInicial.motivoInactivo,
      }),
      por: usuario.nombre,
      porId: usuario.id,
      meta: {
        observaciones: observaciones.length,
        restricciones: restricciones.length,
      },
    });

    const guardado = await equipo.save();

    broadcast("equipment:changed", {
      action: "created",
      id: String(guardado._id),
      placa: guardado.placa,
    });

    await responderEquipo(res, guardado._id, 201);
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        message: "Ya existe un equipo con esa placa",
      });
    }
    res.status(500).json({
      message: error?.message || "No se pudo crear el equipo",
    });
  }
};

export const updateEquipment = async (req, res) => {
  const body = req.body ?? {};
  const usuario = usuarioSesion(req);

  try {
    const equipo = await Equipment.findById(req.params.id);
    if (!equipo) {
      return res.status(404).json({ message: "El equipo no existe" });
    }

    const cambios = [];

    if (body.placa !== undefined) {
      const placa = texto(body.placa);
      if (!placa) {
        return res.status(400).json({ message: "La placa no puede quedar vacía" });
      }
      const placaClave = normalizarPlaca(placa);
      const duplicado = await Equipment.exists({
        placaClave,
        _id: { $ne: equipo._id },
      });
      if (duplicado) {
        return res.status(409).json({
          message: `Ya existe un equipo con la placa "${placa}"`,
        });
      }
      if (placa !== equipo.placa) {
        cambios.push(`Placa: ${equipo.placa} → ${placa}`);
        equipo.placa = placa;
        equipo.placaClave = placaClave;
      }
    }

    if (
      body.categoriaId !== undefined ||
      body.subcategoriaId !== undefined ||
      body.ubicacionId !== undefined
    ) {
      const categoriaId =
        body.categoriaId !== undefined ? texto(body.categoriaId) : String(equipo.categoriaId);
      const subcategoriaId =
        body.subcategoriaId !== undefined
          ? texto(body.subcategoriaId)
          : String(equipo.subcategoriaId ?? "");
      const ubicacionId =
        body.ubicacionId !== undefined ? texto(body.ubicacionId) : String(equipo.ubicacionId);

      const catalogos = await validarCatalogos({
        categoriaId,
        subcategoriaId,
        ubicacionId,
        exigirSubcategoria:
          body.categoriaId !== undefined || body.subcategoriaId !== undefined,
      });
      if (catalogos.error) {
        return res.status(400).json({ message: catalogos.error });
      }

      if (String(equipo.categoriaId) !== String(catalogos.categoria._id)) {
        cambios.push(`Categoría: ${catalogos.categoria.nombre}`);
        equipo.categoriaId = catalogos.categoria._id;
      }

      const subcategoriaNueva = catalogos.subcategoria?._id ?? null;
      if (String(equipo.subcategoriaId ?? "") !== String(subcategoriaNueva ?? "")) {
        cambios.push(
          `Subcategoría: ${texto(catalogos.subcategoria?.nombre) || "sin subcategoría"}`
        );
        equipo.subcategoriaId = subcategoriaNueva;
      }

      if (String(equipo.ubicacionId) !== String(catalogos.ubicacion._id)) {
        cambios.push(`Ubicación: ${catalogos.ubicacion.nombre}`);
        equipo.ubicacionId = catalogos.ubicacion._id;
      }
    }

    if (body.descripcion !== undefined) {
      // Campo legado: ya no se edita desde la interfaz. Se conserva la
      // posibilidad de actualizarlo o vaciarlo por compatibilidad.
      const descripcion = texto(body.descripcion);
      if (descripcion !== texto(equipo.descripcion)) {
        cambios.push("Descripción del equipo actualizada (texto legado)");
        equipo.descripcion = descripcion;
      }
    }

    if (cambios.length > 0) {
      agregarEvento(equipo, {
        tipo: "actualizacion",
        titulo: "Datos del equipo actualizados",
        detalle: cambios.join(" · "),
        estadoAnterior: estadoTexto(equipo),
        estadoNuevo: estadoTexto(equipo),
        por: usuario.nombre,
        porId: usuario.id,
      });
    }

    equipo.actualizadoPor = usuario.nombre;
    equipo.actualizadoPorId = usuario.id;
    await equipo.save();

    broadcast("equipment:changed", {
      action: "updated",
      id: String(equipo._id),
      placa: equipo.placa,
    });

    await responderEquipo(res, equipo._id);
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        message: "Ya existe un equipo con esa placa",
      });
    }
    res.status(500).json({
      message: error?.message || "No se pudo actualizar el equipo",
    });
  }
};

export const changeEquipmentState = async (req, res) => {
  const { estado, motivoInactivo, nota } = req.body ?? {};
  const usuario = usuarioSesion(req);

  try {
    const equipo = await Equipment.findById(req.params.id);
    if (!equipo) {
      return res.status(404).json({ message: "El equipo no existe" });
    }

    if (equipo.custodiaActivaId) {
      return res.status(409).json({
        message:
          "El equipo está asignado a un trabajador (Assignment activa). Descárgalo antes de cambiar su estado.",
      });
    }

    const reservas = await EquipmentAssignment.countDocuments({
      equipoId: equipo._id,
      estado: "Activa",
      fin: { $gte: new Date() },
    });

    const validacion = validarTransicionEstado({
      estadoActual: equipo.estado,
      motivoActual: equipo.motivoInactivo,
      estadoNuevo: texto(estado),
      motivoNuevo: texto(motivoInactivo) || null,
      tieneReservas: reservas > 0,
    });

    if (!validacion.ok) {
      return res.status(409).json({ message: validacion.error });
    }

    const anterior = estadoTexto(equipo);
    equipo.estado = texto(estado);
    equipo.motivoInactivo =
      equipo.estado === "Inactivo" ? texto(motivoInactivo) : null;
    equipo.actualizadoPor = usuario.nombre;
    equipo.actualizadoPorId = usuario.id;

    agregarEvento(equipo, {
      tipo: "cambio_estado",
      titulo: "Cambio de estado",
      detalle: texto(nota) || `Estado anterior: ${anterior}`,
      estadoAnterior: anterior,
      estadoNuevo: estadoTexto(equipo),
      por: usuario.nombre,
      porId: usuario.id,
    });

    await equipo.save();

    broadcast("equipment:changed", {
      action: "state",
      id: String(equipo._id),
      estado: equipo.estado,
      motivoInactivo: equipo.motivoInactivo,
    });

    await responderEquipo(res, equipo._id);
  } catch (error) {
    res.status(500).json({
      message: error?.message || "No se pudo cambiar el estado del equipo",
    });
  }
};

export const getEquipmentImage = async (req, res) => {
  try {
    const equipo = await Equipment.findById(req.params.id)
      .populate("categoriaId", "imagen imagenMiniatura")
      .populate("subcategoriaId", "imagen imagenMiniatura")
      .lean();

    if (!equipo) {
      return res.status(404).json({ message: "El equipo no existe" });
    }

    const { imagen, imagenMiniatura } = imagenDeEquipo(equipo);
    const size = String(req.query.size ?? "full").toLowerCase();
    const elegida =
      size === "thumb"
        ? imagenMiniatura ?? imagen
        : imagen ?? imagenMiniatura;

    const archivo = imagenABuffer(elegida);
    if (!archivo) {
      return res.status(404).json({ message: "El equipo no tiene imagen genérica" });
    }

    res.set("Content-Type", archivo.tipo);
    res.set("Cache-Control", "public, max-age=3600");
    res.send(archivo.buffer);
  } catch (error) {
    res.status(500).json({
      message: error?.message || "No se pudo obtener la imagen",
    });
  }
};

const buscarObservacion = (equipo, observacionId) =>
  equipo.observaciones.id(observacionId) ??
  equipo.observaciones.find(
    (item) => String(item._id) === String(observacionId)
  );

export const addObservation = async (req, res) => {
  const textoObservacion = texto(req.body?.texto);
  const usuario = usuarioSesion(req);

  if (!textoObservacion) {
    return res.status(400).json({ message: "La observación no puede estar vacía" });
  }
  if (textoObservacion.length > 500) {
    return res.status(400).json({ message: "La observación no puede superar 500 caracteres" });
  }

  try {
    const equipo = await Equipment.findById(req.params.id);
    if (!equipo) {
      return res.status(404).json({ message: "El equipo no existe" });
    }

    equipo.observaciones.push({
      texto: textoObservacion,
      por: usuario.nombre,
      porId: usuario.id,
      creadoEn: new Date(),
    });

    agregarEvento(equipo, {
      tipo: "observacion_agregada",
      titulo: "Observación agregada",
      detalle: textoObservacion,
      estadoAnterior: estadoTexto(equipo),
      estadoNuevo: estadoTexto(equipo),
      por: usuario.nombre,
      porId: usuario.id,
    });

    await equipo.save();
    broadcast("equipment:changed", {
      action: "observation-added",
      id: String(equipo._id),
    });

    await responderEquipo(res, equipo._id);
  } catch (error) {
    res.status(500).json({
      message: error?.message || "No se pudo agregar la observación",
    });
  }
};

export const updateObservation = async (req, res) => {
  const textoObservacion = texto(req.body?.texto);
  const usuario = usuarioSesion(req);

  if (!textoObservacion) {
    return res.status(400).json({ message: "La observación no puede estar vacía" });
  }

  try {
    const equipo = await Equipment.findById(req.params.id);
    if (!equipo) {
      return res.status(404).json({ message: "El equipo no existe" });
    }

    const observacion = buscarObservacion(equipo, req.params.observacionId);
    if (!observacion) {
      return res.status(404).json({ message: "La observación no existe" });
    }

    observacion.texto = textoObservacion;
    observacion.editadoEn = new Date();

    agregarEvento(equipo, {
      tipo: "observacion_editada",
      titulo: "Observación editada",
      detalle: textoObservacion,
      estadoAnterior: estadoTexto(equipo),
      estadoNuevo: estadoTexto(equipo),
      por: usuario.nombre,
      porId: usuario.id,
    });

    await equipo.save();
    broadcast("equipment:changed", {
      action: "observation-updated",
      id: String(equipo._id),
    });

    await responderEquipo(res, equipo._id);
  } catch (error) {
    res.status(500).json({
      message: error?.message || "No se pudo editar la observación",
    });
  }
};

export const deleteObservation = async (req, res) => {
  const usuario = usuarioSesion(req);

  try {
    const equipo = await Equipment.findById(req.params.id);
    if (!equipo) {
      return res.status(404).json({ message: "El equipo no existe" });
    }

    const observacion = buscarObservacion(equipo, req.params.observacionId);
    if (!observacion) {
      return res.status(404).json({ message: "La observación no existe" });
    }

    const detalle = observacion.texto;
    equipo.observaciones.pull(observacion._id);

    agregarEvento(equipo, {
      tipo: "observacion_eliminada",
      titulo: "Observación eliminada",
      detalle,
      estadoAnterior: estadoTexto(equipo),
      estadoNuevo: estadoTexto(equipo),
      por: usuario.nombre,
      porId: usuario.id,
    });

    await equipo.save();
    broadcast("equipment:changed", {
      action: "observation-deleted",
      id: String(equipo._id),
    });

    await responderEquipo(res, equipo._id);
  } catch (error) {
    res.status(500).json({
      message: error?.message || "No se pudo eliminar la observación",
    });
  }
};

export const addRestriction = async (req, res) => {
  const textoRestriccion = texto(req.body?.texto);
  const usuario = usuarioSesion(req);

  if (!textoRestriccion) {
    return res.status(400).json({ message: "La restricción no puede estar vacía" });
  }
  if (textoRestriccion.length > 300) {
    return res.status(400).json({ message: "La restricción no puede superar 300 caracteres" });
  }

  try {
    const equipo = await Equipment.findById(req.params.id);
    if (!equipo) {
      return res.status(404).json({ message: "El equipo no existe" });
    }

    equipo.restricciones.push({
      texto: textoRestriccion,
      por: usuario.nombre,
      porId: usuario.id,
      creadoEn: new Date(),
    });

    agregarEvento(equipo, {
      tipo: "restriccion_agregada",
      titulo: "Restricción agregada",
      detalle: textoRestriccion,
      estadoAnterior: estadoTexto(equipo),
      estadoNuevo: estadoTexto(equipo),
      por: usuario.nombre,
      porId: usuario.id,
    });

    await equipo.save();
    broadcast("equipment:changed", {
      action: "restriction-added",
      id: String(equipo._id),
    });

    await responderEquipo(res, equipo._id);
  } catch (error) {
    res.status(500).json({
      message: error?.message || "No se pudo agregar la restricción",
    });
  }
};

export const updateRestriction = async (req, res) => {
  const textoRestriccion = texto(req.body?.texto);
  const usuario = usuarioSesion(req);

  if (!textoRestriccion) {
    return res.status(400).json({ message: "La restricción no puede estar vacía" });
  }

  try {
    const equipo = await Equipment.findById(req.params.id);
    if (!equipo) {
      return res.status(404).json({ message: "El equipo no existe" });
    }

    const restriccion =
      equipo.restricciones.id(req.params.restriccionId) ??
      equipo.restricciones.find(
        (item) => String(item._id) === String(req.params.restriccionId)
      );

    if (!restriccion) {
      return res.status(404).json({ message: "La restricción no existe" });
    }

    restriccion.texto = textoRestriccion;

    agregarEvento(equipo, {
      tipo: "restriccion_editada",
      titulo: "Restricción editada",
      detalle: textoRestriccion,
      estadoAnterior: estadoTexto(equipo),
      estadoNuevo: estadoTexto(equipo),
      por: usuario.nombre,
      porId: usuario.id,
    });

    await equipo.save();
    broadcast("equipment:changed", {
      action: "restriction-updated",
      id: String(equipo._id),
    });

    await responderEquipo(res, equipo._id);
  } catch (error) {
    res.status(500).json({
      message: error?.message || "No se pudo editar la restricción",
    });
  }
};

export const deleteRestriction = async (req, res) => {
  const usuario = usuarioSesion(req);

  try {
    const equipo = await Equipment.findById(req.params.id);
    if (!equipo) {
      return res.status(404).json({ message: "El equipo no existe" });
    }

    const restriccion =
      equipo.restricciones.id(req.params.restriccionId) ??
      equipo.restricciones.find(
        (item) => String(item._id) === String(req.params.restriccionId)
      );

    if (!restriccion) {
      return res.status(404).json({ message: "La restricción no existe" });
    }

    const detalle = restriccion.texto;
    equipo.restricciones.pull(restriccion._id);

    agregarEvento(equipo, {
      tipo: "restriccion_eliminada",
      titulo: "Restricción eliminada",
      detalle,
      estadoAnterior: estadoTexto(equipo),
      estadoNuevo: estadoTexto(equipo),
      por: usuario.nombre,
      porId: usuario.id,
    });

    await equipo.save();
    broadcast("equipment:changed", {
      action: "restriction-deleted",
      id: String(equipo._id),
    });

    await responderEquipo(res, equipo._id);
  } catch (error) {
    res.status(500).json({
      message: error?.message || "No se pudo eliminar la restricción",
    });
  }
};

export const startMaintenance = async (req, res) => {
  const body = req.body ?? {};
  const usuario = usuarioSesion(req);

  try {
    const equipo = await Equipment.findById(req.params.id);
    if (!equipo) {
      return res.status(404).json({ message: "El equipo no existe" });
    }

    if (equipo.estado === "Inactivo" && equipo.motivoInactivo === "Baja") {
      return res.status(409).json({
        message: "Un equipo dado de baja no admite mantenimiento",
      });
    }

    if (equipo.custodiaActivaId) {
      return res.status(409).json({
        message:
          "El equipo está asignado a un trabajador. Descarga la Assignment antes de iniciar mantenimiento.",
      });
    }

    if (equipo.estado === "Inactivo" && equipo.motivoInactivo === "Novedad") {
      return res.status(409).json({
        message:
          "El equipo tiene un caso especial abierto. Ciérralo desde Assignments → Cases.",
      });
    }

    if (equipo.estado === "Inactivo" && equipo.motivoInactivo === "Mantenimiento") {
      return res.status(409).json({
        message: "El equipo ya está en mantenimiento",
      });
    }

    if (tieneMantenimientoEnProceso(equipo.mantenimientos)) {
      return res.status(409).json({
        message: "El equipo ya tiene un mantenimiento en proceso",
      });
    }

    const reservas = await EquipmentAssignment.countDocuments({
      equipoId: equipo._id,
      estado: "Activa",
      fin: { $gte: new Date() },
    });

    if (reservas > 0) {
      return res.status(409).json({
        message:
          "El equipo tiene reservas activas. Libéralas antes de iniciar mantenimiento",
      });
    }

    const tipo = texto(body.tipo) || "Preventivo";
    if (!["Preventivo", "Correctivo"].includes(tipo)) {
      return res.status(400).json({
        message: "El tipo debe ser Preventivo o Correctivo",
      });
    }

    const requiereSeguimiento =
      body.requiereSeguimiento === true || body.requiereSeguimiento === "true";

    let seguimiento = null;
    if (requiereSeguimiento) {
      const inicio = body.seguimientoInicio
        ? new Date(body.seguimientoInicio)
        : null;

      if (!inicio || Number.isNaN(inicio.getTime())) {
        return res.status(400).json({
          message: "Indica una fecha de inicio válida para el seguimiento",
        });
      }

      seguimiento = {
        estado: "Pendiente",
        inicio,
        fin: null,
        nota: "",
        cerradoPor: "",
        cerradoPorId: "",
      };
    }

    const { adjuntos, error: errorAdjuntos } = normalizarAdjuntos(body.adjuntos);
    if (errorAdjuntos) {
      return res.status(400).json({ message: errorAdjuntos });
    }

    const mantenimiento = crearRegistroMantenimiento({
      equipo,
      usuario,
      tipo,
      descripcion: body.descripcion,
      seguimiento,
    });

    const creados = [];
    try {
      for (const adjunto of adjuntos) {
        const documento = await EquipmentMaintenanceAttachment.create({
          equipoId: equipo._id,
          mantenimientoId: mantenimiento._id,
          nombre: adjunto.nombre,
          tipo: adjunto.tipo,
          tamano: adjunto.tamano,
          dataUrl: adjunto.dataUrl,
          subidoPor: usuario.nombre,
          subidoPorId: usuario.id,
        });
        creados.push(documento._id);
      }

      await equipo.save();
    } catch (error) {
      if (creados.length > 0) {
        await EquipmentMaintenanceAttachment.deleteMany({
          _id: { $in: creados },
        });
      }
      throw error;
    }

    broadcast("equipment:changed", {
      action: "maintenance-started",
      id: String(equipo._id),
    });

    await responderEquipo(res, equipo._id);
  } catch (error) {
    res.status(500).json({
      message: error?.message || "No se pudo iniciar el mantenimiento",
    });
  }
};

export const finishMaintenance = async (req, res) => {
  const body = req.body ?? {};
  const usuario = usuarioSesion(req);

  try {
    const equipo = await Equipment.findById(req.params.id);
    if (!equipo) {
      return res.status(404).json({ message: "El equipo no existe" });
    }

    const mantenimiento = buscarMantenimiento(
      equipo,
      req.params.mantenimientoId
    );

    if (!mantenimiento) {
      return res.status(404).json({ message: "El mantenimiento no existe" });
    }

    if (mantenimiento.estado === "Finalizado") {
      return res.status(409).json({ message: "El mantenimiento ya fue finalizado" });
    }

    const resultado = texto(body.resultado) || "Disponible";
    if (!["Disponible", "Baja"].includes(resultado)) {
      return res.status(400).json({
        message: "El resultado debe ser Disponible o Baja",
      });
    }

    if (body.descripcion !== undefined) {
      mantenimiento.descripcion = texto(body.descripcion);
    }

    mantenimiento.estado = "Finalizado";
    mantenimiento.finalizadoEn = new Date();
    mantenimiento.resultado = resultado;
    mantenimiento.progreso = 100;
    mantenimiento.finalizadoPor = usuario.nombre;
    mantenimiento.finalizadoPorId = usuario.id;

    if (
      resultado === "Baja" &&
      mantenimiento.seguimiento?.estado === "Pendiente"
    ) {
      mantenimiento.seguimiento.estado = "Finalizado";
      mantenimiento.seguimiento.fin = new Date();
      mantenimiento.seguimiento.nota = "Equipo dado de baja";
      mantenimiento.seguimiento.cerradoPor = usuario.nombre;
      mantenimiento.seguimiento.cerradoPorId = usuario.id;
    }

    const anterior = estadoTexto(equipo);

    if (resultado === "Baja") {
      equipo.estado = "Inactivo";
      equipo.motivoInactivo = "Baja";
    } else {
      equipo.estado = "Activo";
      equipo.motivoInactivo = null;
    }

    equipo.actualizadoPor = usuario.nombre;
    equipo.actualizadoPorId = usuario.id;

    agregarEvento(equipo, {
      tipo: "mantenimiento_finalizado",
      titulo: "Mantenimiento finalizado",
      detalle: texto(mantenimiento.descripcion) || `Resultado: ${resultado}`,
      estadoAnterior: anterior,
      estadoNuevo: resultado,
      por: usuario.nombre,
      porId: usuario.id,
    });

    await equipo.save();
    broadcast("equipment:changed", {
      action: "maintenance-finished",
      id: String(equipo._id),
    });

    await responderEquipo(res, equipo._id);
  } catch (error) {
    res.status(500).json({
      message: error?.message || "No se pudo finalizar el mantenimiento",
    });
  }
};

export const addMaintenanceStep = async (req, res) => {
  const body = req.body ?? {};
  const usuario = usuarioSesion(req);

  try {
    const equipo = await Equipment.findById(req.params.id);
    if (!equipo) {
      return res.status(404).json({ message: "El equipo no existe" });
    }

    const mantenimiento = buscarMantenimiento(
      equipo,
      req.params.mantenimientoId
    );
    if (!mantenimiento) {
      return res.status(404).json({ message: "El mantenimiento no existe" });
    }

    if (mantenimiento.estado !== "En proceso") {
      return res.status(409).json({
        message: "El mantenimiento ya fue finalizado",
      });
    }

    const textoPaso = texto(body.texto);
    if (!textoPaso) {
      return res.status(400).json({ message: "Escribe el paso realizado" });
    }
    if (textoPaso.length > 2000) {
      return res.status(400).json({
        message: "El paso no puede superar los 2000 caracteres",
      });
    }

    const { valor: avance, error: errorAvance } = normalizarAvance(body.avance);
    if (errorAvance) {
      return res.status(400).json({ message: errorAvance });
    }

    mantenimiento.pasos.push({
      texto: textoPaso,
      avance,
      por: usuario.nombre,
      porId: usuario.id,
      creadoEn: new Date(),
    });
    mantenimiento.progreso = calcularProgreso(mantenimiento);

    equipo.actualizadoPor = usuario.nombre;
    equipo.actualizadoPorId = usuario.id;

    agregarEvento(equipo, {
      tipo: "mantenimiento_paso",
      titulo: "Paso de mantenimiento registrado",
      detalle: textoPaso,
      estadoAnterior: estadoTexto(equipo),
      estadoNuevo: estadoTexto(equipo),
      por: usuario.nombre,
      porId: usuario.id,
    });

    await equipo.save();
    broadcast("equipment:changed", {
      action: "maintenance-step",
      id: String(equipo._id),
    });

    await responderEquipo(res, equipo._id);
  } catch (error) {
    res.status(500).json({
      message: error?.message || "No se pudo registrar el paso",
    });
  }
};

export const updateMaintenanceStep = async (req, res) => {
  const body = req.body ?? {};
  const usuario = usuarioSesion(req);

  try {
    const equipo = await Equipment.findById(req.params.id);
    if (!equipo) {
      return res.status(404).json({ message: "El equipo no existe" });
    }

    const mantenimiento = buscarMantenimiento(
      equipo,
      req.params.mantenimientoId
    );
    if (!mantenimiento) {
      return res.status(404).json({ message: "El mantenimiento no existe" });
    }
    if (mantenimiento.estado !== "En proceso") {
      return res.status(409).json({
        message: "El mantenimiento ya fue finalizado",
      });
    }

    const paso = buscarPaso(mantenimiento, req.params.pasoId);
    if (!paso) {
      return res.status(404).json({ message: "El paso no existe" });
    }

    const textoPaso = texto(body.texto);
    if (!textoPaso) {
      return res.status(400).json({ message: "Escribe el paso realizado" });
    }
    if (textoPaso.length > 2000) {
      return res.status(400).json({
        message: "El paso no puede superar los 2000 caracteres",
      });
    }

    paso.texto = textoPaso;

    if (body.avance !== undefined) {
      const { valor: avance, error: errorAvance } = normalizarAvance(body.avance);
      if (errorAvance) {
        return res.status(400).json({ message: errorAvance });
      }
      paso.avance = avance;
    }

    mantenimiento.progreso = calcularProgreso(mantenimiento);

    equipo.actualizadoPor = usuario.nombre;
    equipo.actualizadoPorId = usuario.id;

    agregarEvento(equipo, {
      tipo: "mantenimiento_paso_editado",
      titulo: "Paso de mantenimiento editado",
      detalle: textoPaso,
      estadoAnterior: estadoTexto(equipo),
      estadoNuevo: estadoTexto(equipo),
      por: usuario.nombre,
      porId: usuario.id,
    });

    await equipo.save();
    broadcast("equipment:changed", {
      action: "maintenance-step-updated",
      id: String(equipo._id),
    });

    await responderEquipo(res, equipo._id);
  } catch (error) {
    res.status(500).json({
      message: error?.message || "No se pudo editar el paso",
    });
  }
};

export const deleteMaintenanceStep = async (req, res) => {
  const usuario = usuarioSesion(req);

  try {
    const equipo = await Equipment.findById(req.params.id);
    if (!equipo) {
      return res.status(404).json({ message: "El equipo no existe" });
    }

    const mantenimiento = buscarMantenimiento(
      equipo,
      req.params.mantenimientoId
    );
    if (!mantenimiento) {
      return res.status(404).json({ message: "El mantenimiento no existe" });
    }
    if (mantenimiento.estado !== "En proceso") {
      return res.status(409).json({
        message: "El mantenimiento ya fue finalizado",
      });
    }

    const paso = buscarPaso(mantenimiento, req.params.pasoId);
    if (!paso) {
      return res.status(404).json({ message: "El paso no existe" });
    }

    const textoPaso = paso.texto;
    mantenimiento.pasos.pull(paso._id);
    mantenimiento.progreso = calcularProgreso(mantenimiento);

    await EquipmentMaintenanceAttachment.deleteMany({
      equipoId: equipo._id,
      mantenimientoId: mantenimiento._id,
      pasoId: paso._id,
    });

    equipo.actualizadoPor = usuario.nombre;
    equipo.actualizadoPorId = usuario.id;

    agregarEvento(equipo, {
      tipo: "mantenimiento_paso_eliminado",
      titulo: "Paso de mantenimiento eliminado",
      detalle: textoPaso,
      estadoAnterior: estadoTexto(equipo),
      estadoNuevo: estadoTexto(equipo),
      por: usuario.nombre,
      porId: usuario.id,
    });

    await equipo.save();
    broadcast("equipment:changed", {
      action: "maintenance-step-deleted",
      id: String(equipo._id),
    });

    await responderEquipo(res, equipo._id);
  } catch (error) {
    res.status(500).json({
      message: error?.message || "No se pudo eliminar el paso",
    });
  }
};

export const addFollowupNote = async (req, res) => {
  const body = req.body ?? {};
  const usuario = usuarioSesion(req);

  try {
    const equipo = await Equipment.findById(req.params.id);
    if (!equipo) {
      return res.status(404).json({ message: "El equipo no existe" });
    }

    const mantenimiento = buscarMantenimiento(
      equipo,
      req.params.mantenimientoId
    );
    if (!mantenimiento) {
      return res.status(404).json({ message: "El mantenimiento no existe" });
    }

    if (!mantenimiento.seguimiento) {
      return res.status(404).json({
        message: "El mantenimiento no tiene seguimiento",
      });
    }

    if (mantenimiento.seguimiento.estado !== "Pendiente") {
      return res.status(409).json({
        message: "El seguimiento ya fue cerrado",
      });
    }

    const textoNota = texto(body.texto);
    if (!textoNota) {
      return res.status(400).json({ message: "Escribe una anotación" });
    }
    if (textoNota.length > 2000) {
      return res.status(400).json({
        message: "La anotación no puede superar los 2000 caracteres",
      });
    }

    mantenimiento.seguimiento.anotaciones.push({
      texto: textoNota,
      por: usuario.nombre,
      porId: usuario.id,
      creadoEn: new Date(),
    });

    equipo.actualizadoPor = usuario.nombre;
    equipo.actualizadoPorId = usuario.id;

    agregarEvento(equipo, {
      tipo: "seguimiento_anotacion",
      titulo: "Anotación de seguimiento",
      detalle: textoNota,
      estadoAnterior: estadoTexto(equipo),
      estadoNuevo: estadoTexto(equipo),
      por: usuario.nombre,
      porId: usuario.id,
    });

    await equipo.save();
    broadcast("equipment:changed", {
      action: "maintenance-followup-note",
      id: String(equipo._id),
    });

    await responderEquipo(res, equipo._id);
  } catch (error) {
    res.status(500).json({
      message: error?.message || "No se pudo registrar la anotación",
    });
  }
};

export const getPendingFollowups = async (req, res) => {
  try {
    const data = await listarSeguimientosPendientes();
    res.json(data);
  } catch (error) {
    res.status(500).json({
      message: error?.message || "No se pudieron consultar los seguimientos",
    });
  }
};

export const listMaintenanceAttachments = async (req, res) => {
  try {
    const equipo = await Equipment.findById(req.params.id).select(
      "_id mantenimientos"
    );
    if (!equipo) {
      return res.status(404).json({ message: "El equipo no existe" });
    }

    if (
      !esObjectIdValido(req.params.mantenimientoId) ||
      !equipo.mantenimientos.id(req.params.mantenimientoId)
    ) {
      return res.status(404).json({ message: "El mantenimiento no existe" });
    }

    const adjuntos = await EquipmentMaintenanceAttachment.find({
      equipoId: equipo._id,
      mantenimientoId: req.params.mantenimientoId,
    })
      .sort({ createdAt: 1 })
      .lean();

    res.json({
      total: adjuntos.length,
      adjuntos: adjuntos.map((adjunto) =>
        serializarAdjunto(adjunto, String(equipo._id))
      ),
    });
  } catch (error) {
    res.status(500).json({
      message: error?.message || "No se pudieron consultar los adjuntos",
    });
  }
};

export const addMaintenanceAttachments = async (req, res) => {
  const body = req.body ?? {};
  const usuario = usuarioSesion(req);

  try {
    const equipo = await Equipment.findById(req.params.id);
    if (!equipo) {
      return res.status(404).json({ message: "El equipo no existe" });
    }

    const mantenimiento = buscarMantenimiento(
      equipo,
      req.params.mantenimientoId
    );
    if (!mantenimiento) {
      return res.status(404).json({ message: "El mantenimiento no existe" });
    }

    const { adjuntos, error } = normalizarAdjuntos(body.adjuntos);
    if (error) {
      return res.status(400).json({ message: error });
    }

    if (adjuntos.length === 0) {
      return res.status(400).json({ message: "Selecciona al menos un archivo" });
    }

    const pasoId = texto(body.pasoId);
    let paso = null;
    if (pasoId) {
      paso = buscarPaso(mantenimiento, pasoId);
      if (!paso) {
        return res.status(404).json({ message: "El paso no existe" });
      }
      if (mantenimiento.estado !== "En proceso") {
        return res.status(409).json({
          message: "El mantenimiento ya fue finalizado",
        });
      }
      if (adjuntos.some((adjunto) => !adjunto.tipo.startsWith("image/"))) {
        return res.status(400).json({
          message: "Las imágenes del paso deben ser archivos de imagen",
        });
      }
    }

    const actuales = await EquipmentMaintenanceAttachment.countDocuments({
      equipoId: equipo._id,
      mantenimientoId: mantenimiento._id,
      pasoId: paso ? paso._id : null,
    });

    if (actuales + adjuntos.length > MAX_ADJUNTOS) {
      return res.status(400).json({
        message: paso
          ? `Máximo ${MAX_ADJUNTOS} imágenes por paso`
          : `Máximo ${MAX_ADJUNTOS} adjuntos por mantenimiento`,
      });
    }

    const creados = [];
    try {
      for (const adjunto of adjuntos) {
        const documento = await EquipmentMaintenanceAttachment.create({
          equipoId: equipo._id,
          mantenimientoId: mantenimiento._id,
          pasoId: paso ? paso._id : null,
          nombre: adjunto.nombre,
          tipo: adjunto.tipo,
          tamano: adjunto.tamano,
          dataUrl: adjunto.dataUrl,
          subidoPor: usuario.nombre,
          subidoPorId: usuario.id,
        });
        creados.push(documento._id);
      }
    } catch (error) {
      if (creados.length > 0) {
        await EquipmentMaintenanceAttachment.deleteMany({
          _id: { $in: creados },
        });
      }
      throw error;
    }

    broadcast("equipment:changed", {
      action: "maintenance-attachments-added",
      id: String(equipo._id),
    });

    await responderEquipo(res, equipo._id);
  } catch (error) {
    res.status(500).json({
      message: error?.message || "No se pudieron agregar los adjuntos",
    });
  }
};

export const updateMaintenanceAttachment = async (req, res) => {
  const body = req.body ?? {};

  try {
    const adjunto = await buscarAdjunto(
      req.params.id,
      req.params.mantenimientoId,
      req.params.adjuntoId
    );

    if (!adjunto) {
      return res.status(404).json({ message: "El adjunto no existe" });
    }

    if (body.nombre !== undefined) {
      const nombre = texto(body.nombre).slice(0, 180);
      if (!nombre) {
        return res.status(400).json({ message: "El nombre no puede estar vacío" });
      }
      adjunto.nombre = nombre;
    }

    const nuevoArchivo = body.archivo ?? body.adjunto ?? null;
    if (nuevoArchivo) {
      const { adjunto: normalizado, error } = normalizarAdjunto(nuevoArchivo);
      if (error) {
        return res.status(400).json({ message: error });
      }

      adjunto.nombre = normalizado.nombre;
      adjunto.tipo = normalizado.tipo;
      adjunto.tamano = normalizado.tamano;
      adjunto.dataUrl = normalizado.dataUrl;
    }

    await adjunto.save();

    broadcast("equipment:changed", {
      action: "maintenance-attachment-updated",
      id: String(adjunto.equipoId),
    });

    await responderEquipo(res, adjunto.equipoId);
  } catch (error) {
    res.status(500).json({
      message: error?.message || "No se pudo actualizar el adjunto",
    });
  }
};

export const deleteMaintenanceAttachment = async (req, res) => {
  try {
    const adjunto = await buscarAdjunto(
      req.params.id,
      req.params.mantenimientoId,
      req.params.adjuntoId
    );

    if (!adjunto) {
      return res.status(404).json({ message: "El adjunto no existe" });
    }

    const equipoId = adjunto.equipoId;
    await adjunto.deleteOne();

    broadcast("equipment:changed", {
      action: "maintenance-attachment-deleted",
      id: String(equipoId),
    });

    await responderEquipo(res, equipoId);
  } catch (error) {
    res.status(500).json({
      message: error?.message || "No se pudo eliminar el adjunto",
    });
  }
};

export const getMaintenanceAttachmentFile = async (req, res) => {
  try {
    const adjunto = await buscarAdjunto(
      req.params.id,
      req.params.mantenimientoId,
      req.params.adjuntoId
    );

    if (!adjunto) {
      return res.status(404).json({ message: "El adjunto no existe" });
    }

    const match = /^data:([^;]+);base64,(.*)$/is.exec(adjunto.dataUrl ?? "");
    if (!match) {
      return res.status(404).json({ message: "El archivo no está disponible" });
    }

    const buffer = Buffer.from(match[2], "base64");
    const tipo = texto(adjunto.tipo) || match[1];
    const descargar = ["1", "true"].includes(String(req.query.descargar));
    const nombre = texto(adjunto.nombre) || "adjunto";
    const ascii = nombre.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");

    res.setHeader("Content-Type", tipo);
    res.setHeader(
      "Content-Disposition",
      `${descargar ? "attachment" : "inline"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(nombre)}`
    );
    res.setHeader("Cache-Control", "private, max-age=300");
    res.send(buffer);
  } catch (error) {
    res.status(500).json({
      message: error?.message || "No se pudo leer el adjunto",
    });
  }
};

export const closeMaintenanceFollowup = async (req, res) => {
  const body = req.body ?? {};
  const usuario = usuarioSesion(req);

  try {
    const equipo = await Equipment.findById(req.params.id);
    if (!equipo) {
      return res.status(404).json({ message: "El equipo no existe" });
    }

    const mantenimiento = buscarMantenimiento(
      equipo,
      req.params.mantenimientoId
    );
    if (!mantenimiento) {
      return res.status(404).json({ message: "El mantenimiento no existe" });
    }

    if (!mantenimiento.seguimiento) {
      return res.status(404).json({ message: "El mantenimiento no tiene seguimiento" });
    }

    if (mantenimiento.seguimiento.estado === "Finalizado") {
      return res.status(409).json({ message: "El seguimiento ya fue cerrado" });
    }

    const nota = texto(body.nota);
    if (!nota) {
      return res.status(400).json({ message: "Escribe una nota de cierre" });
    }

    mantenimiento.seguimiento.estado = "Finalizado";
    mantenimiento.seguimiento.fin = new Date();
    mantenimiento.seguimiento.nota = nota;
    mantenimiento.seguimiento.cerradoPor = usuario.nombre;
    mantenimiento.seguimiento.cerradoPorId = usuario.id;

    equipo.actualizadoPor = usuario.nombre;
    equipo.actualizadoPorId = usuario.id;

    agregarEvento(equipo, {
      tipo: "seguimiento_cerrado",
      titulo: "Seguimiento de mantenimiento cerrado",
      detalle: nota,
      estadoAnterior: estadoTexto(equipo),
      estadoNuevo: estadoTexto(equipo),
      por: usuario.nombre,
      porId: usuario.id,
    });

    await equipo.save();

    broadcast("equipment:changed", {
      action: "maintenance-followup-closed",
      id: String(equipo._id),
    });

    await responderEquipo(res, equipo._id);
  } catch (error) {
    res.status(500).json({
      message: error?.message || "No se pudo cerrar el seguimiento",
    });
  }
};

export const getEquipmentAssignments = async (req, res) => {
  try {
    const equipo = await Equipment.findById(req.params.id).select("_id");
    if (!equipo) {
      return res.status(404).json({ message: "El equipo no existe" });
    }

    const reservas = await EquipmentAssignment.find({ equipoId: equipo._id })
      .sort({ inicio: -1 })
      .lean();

    res.json(reservas);
  } catch (error) {
    res.status(500).json({
      message: error?.message || "No se pudieron consultar las reservas",
    });
  }
};

export const listEquipmentRestrictions = async (req, res) => {
  try {
    const equipo = await Equipment.findById(req.params.id).select("restricciones placa");
    if (!equipo) {
      return res.status(404).json({ message: "El equipo no existe" });
    }
    res.json({
      placa: equipo.placa,
      restricciones: textosRestricciones(equipo),
    });
  } catch (error) {
    res.status(500).json({
      message: error?.message || "No se pudieron consultar las restricciones",
    });
  }
};
