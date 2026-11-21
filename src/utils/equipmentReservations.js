/**
 * Servicio compartido de disponibilidad y reservas de equipos.
 *
 * Lo usan Programmer y Requirements. Una reserva siempre es de una placa
 * concreta y de una franja concreta; por eso el mismo equipo puede reservarse
 * en días distintos, pero nunca en franjas que se crucen.
 */

import Equipment from "../models/Equipment";
import EquipmentAssignment from "../models/EquipmentAssignment";
import EquipmentCustody from "../models/EquipmentCustody";
import { broadcast } from "../realtime";
import { catalogosPorTexto } from "./equipmentCatalogSearch";
import { agregarEvento } from "./equipmentHistory";
import {
  construirResumenDisponibilidad,
  esObjectIdValido,
  hayCruce,
  textosRestricciones,
} from "./equipmentRules";
import { serializarEquipo } from "./equipmentSerializer";
import { intervaloEvento } from "./programmerRules";

const texto = (valor) => String(valor ?? "").trim();

const listaRestricciones = (item) =>
  (Array.isArray(item?.restricciones ?? item?.Restricciones)
    ? item.restricciones ?? item.Restricciones
    : []
  )
    .map((restriccion) => texto(restriccion?.texto ?? restriccion))
    .filter(Boolean);

/** Convierte una línea de requerimiento (Programmer o Requirements) al shape interno. */
export const normalizarLineaEquipo = (item = {}) => ({
  inventarioId: texto(
    item.inventarioId ??
      item.InventarioId ??
      item.equipoId ??
      item.EquipoId
  ),
  placa: texto(item.placa ?? item.Placa),
  categoria: texto(item.categoria ?? item.Categoria),
  descripcion: texto(
    item.descripcion ?? item.Descripcion ?? item.equipo ?? item.Equipo
  ),
  imagenActualizadaEn:
    item.imagenActualizadaEn ?? item.ImagenActualizadaEn ?? null,
  restricciones: listaRestricciones(item),
  restriccionesAceptadasPor: texto(
    item.restriccionesAceptadasPor ?? item.RestriccionesAceptadasPor
  ),
  restriccionesAceptadasPorId: texto(
    item.restriccionesAceptadasPorId ?? item.RestriccionesAceptadasPorId
  ),
  restriccionesAceptadasEl:
    item.restriccionesAceptadasEl ?? item.RestriccionesAceptadasEl ?? null,
  cantidad: 1,
  notas: texto(item.notas ?? item.Notas),
  aceptaRestricciones: Boolean(
    item.aceptaRestricciones ?? item.AceptaRestricciones
  ),
});

const queryReservasActivas = ({ ids, intervalo, excluirOrigen = null }) => {
  const query = {
    equipoId: { $in: ids },
    estado: "Activa",
    inicio: { $lt: intervalo.fin },
    fin: { $gt: intervalo.inicio },
  };

  return EquipmentAssignment.find(query).lean().then((reservas) => {
    if (!excluirOrigen?.id) return reservas;

    return reservas.filter(
      (reserva) =>
        !(
          reserva.origenTipo === excluirOrigen.tipo &&
          String(reserva.origenId) === String(excluirOrigen.id)
        )
    );
  });
};

/**
 * Valida que las líneas de equipo se puedan reservar en la franja.
 * Devuelve { error } o { equipos: [{ linea, equipo }], intervalo }.
 */
export const validarEquiposParaReserva = async ({
  equipos = [],
  fechaClave,
  timeIn,
  timeOut,
  excluirOrigen = null,
}) => {
  if (!Array.isArray(equipos) || equipos.length === 0) {
    return { equipos: [], intervalo: null, error: null };
  }

  const intervalo = intervaloEvento(fechaClave, timeIn, timeOut);
  if (!intervalo) {
    return {
      equipos: [],
      intervalo: null,
      error: "La fecha y las horas del requerimiento no son válidas",
    };
  }

  const lineas = equipos.map(normalizarLineaEquipo);
  const ids = [];
  const vistos = new Set();

  for (const linea of lineas) {
    if (!linea.inventarioId) {
      return {
        equipos: [],
        intervalo,
        error: `La línea "${
          linea.placa || linea.descripcion || "equipo"
        }" no tiene una placa real de GM-Activos. Reemplázala por un equipo del inventario.`,
      };
    }

    if (!esObjectIdValido(linea.inventarioId)) {
      return {
        equipos: [],
        intervalo,
        error: `El equipo "${
          linea.placa || linea.descripcion || linea.inventarioId
        }" es un registro legado y no existe en el inventario real. Reemplázalo por una placa de GM-Activos.`,
      };
    }

    if (vistos.has(linea.inventarioId)) {
      return {
        equipos: [],
        intervalo,
        error: `El equipo "${
          linea.placa || linea.inventarioId
        }" está repetido en la solicitud. Usa una sola línea por placa.`,
      };
    }

    vistos.add(linea.inventarioId);
    ids.push(linea.inventarioId);
  }

  const documentos = await Equipment.find({ _id: { $in: ids } })
    .populate("categoriaId", "nombre descripcion imagen imagenMiniatura")
    .populate("subcategoriaId", "nombre descripcion imagen imagenMiniatura")
    .populate("ubicacionId", "nombre")
    .lean();

  const porId = new Map(documentos.map((equipo) => [String(equipo._id), equipo]));

  for (const linea of lineas) {
    const equipo = porId.get(linea.inventarioId);

    if (!equipo) {
      return {
        equipos: [],
        intervalo,
        error: `El equipo "${
          linea.placa || linea.inventarioId
        }" no existe en el inventario de GM-Activos.`,
      };
    }

    if (equipo.estado !== "Activo") {
      return {
        equipos: [],
        intervalo,
        error: `El equipo ${equipo.placa} está en estado ${
          equipo.motivoInactivo || "Inactivo"
        }; solo se pueden asignar equipos disponibles.`,
      };
    }

    if (equipo.custodiaActivaId) {
      return {
        equipos: [],
        intervalo,
        error: `El equipo ${equipo.placa} está asignado a un trabajador (Assignment activa). Debe descargarse antes de reservarlo en otro requerimiento.`,
      };
    }

    const restricciones = textosRestricciones(equipo);
    const aceptada =
      linea.aceptaRestricciones ||
      Boolean(linea.restriccionesAceptadasPor) ||
      Boolean(linea.restriccionesAceptadasEl);

    if (restricciones.length > 0 && !aceptada) {
      return {
        equipos: [],
        intervalo,
        error: `Debes aceptar las restricciones de ${equipo.placa}: ${restricciones.join(
          " · "
        )}`,
      };
    }
  }

  const reservas = await queryReservasActivas({
    ids,
    intervalo,
    excluirOrigen,
  });

  if (reservas.length > 0) {
    const reservados = new Set(reservas.map((reserva) => String(reserva.equipoId)));
    const conflicto = documentos.find((equipo) => reservados.has(String(equipo._id)));

    return {
      equipos: [],
      intervalo,
      error: `El equipo ${
        conflicto?.placa || "seleccionado"
      } ya está reservado en esa franja. Solo se muestran los equipos disponibles.`,
    };
  }

  return {
    error: null,
    intervalo,
    equipos: lineas.map((linea) => ({
      linea,
      equipo: porId.get(linea.inventarioId),
    })),
  };
};

/**
 * Crea las reservas de un requerimiento. Si una falla, elimina las creadas.
 */
export const reservarEquiposParaOrigen = async ({
  equipos = [],
  fechaClave,
  timeIn,
  timeOut,
  origenTipo,
  origenId,
  origenCodigo = "",
  origenNombre = "",
  usuario = {},
  excluirOrigen = null,
}) => {
  const validacion = await validarEquiposParaReserva({
    equipos,
    fechaClave,
    timeIn,
    timeOut,
    excluirOrigen,
  });

  if (validacion.error) return validacion;
  if (validacion.equipos.length === 0) {
    return { asignaciones: [], equipos: [], intervalo: validacion.intervalo, error: null };
  }

  const creadas = [];

  try {
    for (const { linea, equipo } of validacion.equipos) {
      const asignacion = await EquipmentAssignment.create({
        equipoId: equipo._id,
        placaSnapshot: equipo.placa,
        categoriaSnapshot: texto(equipo.categoriaId?.nombre),
        origenTipo,
        origenId,
        origenCodigo,
        origenNombre,
        fecha: fechaClave,
        inicio: validacion.intervalo.inicio,
        fin: validacion.intervalo.fin,
        estado: "Activa",
        asignadoPor: texto(usuario.nombre),
        asignadoPorId: texto(usuario.id),
        asignadoEn: new Date(),
      });

      creadas.push(asignacion);

      const documento = await Equipment.findById(equipo._id);
      if (documento) {
        agregarEvento(documento, {
          tipo: "asignacion",
          titulo: "Equipo asignado",
          detalle: `${origenTipo} ${origenCodigo || origenId} · ${origenNombre}`.trim(),
          estadoAnterior: documento.motivoInactivo ?? "Disponible",
          estadoNuevo: "Asignado",
          por: texto(usuario.nombre),
          porId: texto(usuario.id),
          meta: {
            origenTipo,
            origenId: String(origenId),
            origenCodigo,
            inicio: validacion.intervalo.inicio,
            fin: validacion.intervalo.fin,
            restricciones: textosRestricciones(equipo),
          },
        });
        documento.actualizadoPor = texto(usuario.nombre);
        documento.actualizadoPorId = texto(usuario.id);
        if (linea.restriccionesAceptadasPor) {
          documento.hojaDeVida.push({
            tipo: "restricciones_aceptadas",
            titulo: "Restricciones aceptadas al asignar",
            detalle: `Aceptadas por ${linea.restriccionesAceptadasPor}`,
            por: linea.restriccionesAceptadasPor,
            porId: linea.restriccionesAceptadasPorId,
            el: linea.restriccionesAceptadasEl || new Date(),
            meta: { restricciones: textosRestricciones(equipo) },
          });
        }
        await documento.save();
      }
    }

    broadcast("equipment:changed", {
      action: "assigned",
      origenTipo,
      origenId: String(origenId),
    });
    broadcast("equipment-assignment:changed", {
      action: "assigned",
      origenTipo,
      origenId: String(origenId),
    });

    return {
      asignaciones: creadas,
      equipos: validacion.equipos,
      intervalo: validacion.intervalo,
      error: null,
    };
  } catch (error) {
    if (creadas.length > 0) {
      await EquipmentAssignment.deleteMany({
        _id: { $in: creadas.map((asignacion) => asignacion._id) },
      }).catch(() => {});
    }

    return {
      asignaciones: [],
      equipos: [],
      intervalo: validacion.intervalo,
      error: error?.message || "No se pudieron crear las reservas de equipos",
    };
  }
};

/** Libera las reservas activas de un requerimiento. */
export const liberarEquiposDeOrigen = async ({
  origenTipo,
  origenId,
  usuario = {},
  motivo = "",
}) => {
  const reservas = await EquipmentAssignment.find({
    origenTipo,
    origenId,
    estado: "Activa",
  });

  if (reservas.length === 0) return 0;

  const idsEquipos = [...new Set(reservas.map((reserva) => String(reserva.equipoId)))];

  const equiposConCustodia = new Set(
    (
      await Equipment.find({
        _id: { $in: idsEquipos },
        custodiaActivaId: { $ne: null },
      })
        .select("_id")
        .lean()
    ).map((equipo) => String(equipo._id))
  );

  const liberables = reservas.filter(
    (reserva) => !equiposConCustodia.has(String(reserva.equipoId))
  );

  for (const reserva of liberables) {
    reserva.estado = "Liberada";
    reserva.liberadoPor = texto(usuario.nombre);
    reserva.liberadoPorId = texto(usuario.id);
    reserva.liberadoEn = new Date();
    reserva.motivoLiberacion = texto(motivo);
    await reserva.save();
  }

  const idsLiberables = [
    ...new Set(liberables.map((reserva) => String(reserva.equipoId))),
  ];
  const equipos = await Equipment.find({ _id: { $in: idsLiberables } });
  for (const equipo of equipos) {
    agregarEvento(equipo, {
      tipo: "liberacion",
      titulo: "Equipo liberado",
      detalle: motivo || `Reserva ${origenTipo} liberada`,
      estadoAnterior: "Asignado",
      estadoNuevo: "Disponible",
      por: texto(usuario.nombre),
      porId: texto(usuario.id),
      meta: { origenTipo, origenId: String(origenId) },
    });
    equipo.actualizadoPor = texto(usuario.nombre);
    equipo.actualizadoPorId = texto(usuario.id);
    await equipo.save();
  }

  broadcast("equipment:changed", {
    action: "released",
    origenTipo,
    origenId: String(origenId),
  });
  broadcast("equipment-assignment:changed", {
    action: "released",
    origenTipo,
    origenId: String(origenId),
  });

  return liberables.length;
};

export const obtenerReservasDeOrigen = ({ origenTipo, origenId }) =>
  EquipmentAssignment.find({ origenTipo, origenId })
    .sort({ inicio: -1 })
    .lean();

/**
 * Lista de disponibilidad para los selectores de Programmer/Requirements.
 * Por defecto solo devuelve equipos disponibles; el resumen siempre incluye
 * total, inactivos, reservados en la franja y disponibles.
 */
export const listarDisponibilidad = async ({
  fechaClave,
  timeIn,
  timeOut,
  categoriaId = "",
  q = "",
  incluirNoDisponibles = false,
  excluirOrigenTipo = "",
  excluirOrigenId = "",
}) => {
  const intervalo = intervaloEvento(fechaClave, timeIn, timeOut);
  if (!intervalo) {
    return {
      error: "La fecha y las horas del requerimiento no son válidas",
      resumen: null,
      equipos: [],
    };
  }

  const filtro = {};
  if (categoriaId && esObjectIdValido(categoriaId)) filtro.categoriaId = categoriaId;
  if (texto(q)) {
    const busqueda = await catalogosPorTexto(texto(q));

    if (busqueda) {
      filtro.$or = [{ placa: busqueda.patron }, { descripcion: busqueda.patron }];

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
  let reservas = ids.length
    ? await EquipmentAssignment.find({
        equipoId: { $in: ids },
        estado: "Activa",
        inicio: { $lt: intervalo.fin },
        fin: { $gt: intervalo.inicio },
      }).lean()
    : [];

  const custodias = ids.length
    ? await EquipmentCustody.find({
        activa: true,
        "equipos.equipoId": { $in: ids },
      })
        .select("codigo estado trabajadorNombre equipos.equipoId creadaEn createdAt")
        .lean()
    : [];

  const custodiaPorEquipo = new Map();
  custodias.forEach((custodia) => {
    (custodia.equipos ?? []).forEach((item) => {
      const clave = String(item.equipoId);
      if (!custodiaPorEquipo.has(clave)) {
        custodiaPorEquipo.set(clave, custodia);
      }
    });
  });

  if (excluirOrigenTipo && excluirOrigenId) {
    reservas = reservas.filter(
      (reserva) =>
        !(
          reserva.origenTipo === excluirOrigenTipo &&
          String(reserva.origenId) === String(excluirOrigenId)
        )
    );
  }

  const reservados = new Set(reservas.map((reserva) => String(reserva.equipoId)));
  const enCustodia = new Set(custodiaPorEquipo.keys());
  const { resumen, disponibles } = construirResumenDisponibilidad({
    equipos,
    reservados,
    enCustodia,
  });

  const base = incluirNoDisponibles ? equipos : disponibles;
  const reservasPorEquipo = new Map();
  reservas.forEach((reserva) => {
    const clave = String(reserva.equipoId);
    if (!reservasPorEquipo.has(clave)) reservasPorEquipo.set(clave, []);
    reservasPorEquipo.get(clave).push(reserva);
  });

  const serializados = base.map((equipo) => {
    const id = String(equipo._id);
    const serializado = serializarEquipo(equipo, {
      reservas: reservasPorEquipo.get(id) ?? [],
      custodia: custodiaPorEquipo.get(id) ?? null,
      incluirHistorial: false,
      incluirMantenimientos: false,
    });

    const disponible =
      equipo.estado === "Activo" &&
      !reservados.has(id) &&
      !enCustodia.has(id);

    return {
      ...serializado,
      disponible,
      motivoNoDisponible:
        equipo.estado === "Inactivo"
          ? equipo.motivoInactivo || "Inactivo"
          : enCustodia.has(id)
            ? "Asignado a un trabajador"
            : reservados.has(id)
              ? "Reservado en esta franja"
              : null,
    };
  });

  return { error: null, resumen, equipos: serializados, intervalo };
};

export const resumenGeneralEquipos = async () => {
  const equipos = await Equipment.find().select("estado motivoInactivo categoriaId").lean();
  const resumen = {
    total: equipos.length,
    activos: 0,
    inactivos: 0,
    disponibles: 0,
    asignados: 0,
    mantenimiento: 0,
    protegidos: 0,
    baja: 0,
  };

  const idsActivos = [];

  equipos.forEach((equipo) => {
    if (equipo.estado === "Inactivo") {
      resumen.inactivos += 1;
      if (equipo.motivoInactivo === "Mantenimiento") resumen.mantenimiento += 1;
      if (equipo.motivoInactivo === "Protegido") resumen.protegidos += 1;
      if (equipo.motivoInactivo === "Baja") resumen.baja += 1;
      return;
    }

    resumen.activos += 1;
    idsActivos.push(equipo._id);
  });

  if (idsActivos.length > 0) {
    const ahora = new Date();
    const [asignados, enCustodia] = await Promise.all([
      EquipmentAssignment.distinct("equipoId", {
        equipoId: { $in: idsActivos },
        estado: "Activa",
        fin: { $gte: ahora },
      }),
      Equipment.distinct("_id", {
        _id: { $in: idsActivos },
        custodiaActivaId: { $ne: null },
      }),
    ]);
    const setAsignados = new Set([
      ...asignados.map((id) => String(id)),
      ...enCustodia.map((id) => String(id)),
    ]);
    resumen.asignados = setAsignados.size;
    resumen.disponibles = Math.max(0, resumen.activos - resumen.asignados);
  }

  return resumen;
};

export const hayCruceReserva = hayCruce;
