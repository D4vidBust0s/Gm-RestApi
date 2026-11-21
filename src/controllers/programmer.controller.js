/*
  Archivo con la logica y ejecución de todos los procesos que interactuan con
  la base de datos con respecto al programmador.

  Un registro de Programmer representa a la vez:
    - el evento que ModalPlanner1 agrega como Type: "Programmer";
    - el requerimiento manual capturado mientras no existe el sistema de
      Requirements (o cuando el requerimiento llega por correo).

  El flujo formal es:
    Pendiente -> En revisión -> Aprobada/Agendado/Rechazada.
  Aprobada y Agendado se ofrecen a ModalPlanner1; Agendado indica personal
  completo.
*/

import mongoose from "mongoose";

import Programmers from "../models/Programmer";
import Payroll from "../models/Payroll";
import Groups from "../models/Groups";
import Department from "../models/Department";
import Equipment from "../models/Equipment";
import { broadcast } from "../realtime";
import { generarCodigoProgrammer } from "../utils/programmerCode";
import {
  esEstadoFinal,
  estadoAprobado,
  estadoTrasAsignacion,
  hayCruce,
  intervaloEvento,
  motivoObligatorio,
  normalizar,
  permiteAsignarPersonal,
  rangoAnioUtc,
  rangoDiaUtc,
  transicionDecisionValida,
} from "../utils/programmerRules";
import {
  liberarEquiposDeOrigen,
  reservarEquiposParaOrigen,
  validarEquiposParaReserva,
} from "../utils/equipmentReservations";
import {
  descripcionEquipo,
  esObjectIdValido,
  textosRestricciones,
} from "../utils/equipmentRules";
import {
  custodiasActivasDeOrigen,
  tieneCustodiaActivaDeOrigen,
} from "../utils/equipmentCustody";
import {
  asegurarTurnosDirectosProgramador,
  eliminarTurnoDirectoProgramador,
  eliminarTurnosDirectosProgramador,
} from "../utils/programmerDirectShift";

const texto = (valor) => (typeof valor === "string" ? valor.trim() : "");

const escaparRegex = (valor) =>
  String(valor ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const MAPA_ACENTOS = {
  a: "[aá]",
  á: "[aá]",
  e: "[eé]",
  é: "[eé]",
  i: "[ií]",
  í: "[ií]",
  o: "[oó]",
  ó: "[oó]",
  u: "[uú]",
  ú: "[uú]",
  n: "[nñ]",
  ñ: "[nñ]",
};

const patronBusqueda = (valor) =>
  new RegExp(
    String(valor ?? "")
      .split("")
      .map((caracter) => MAPA_ACENTOS[caracter.toLowerCase()] ?? escaparRegex(caracter))
      .join(""),
    "i"
  );

const numero = (valor) => {
  const convertido = Number(valor);
  return Number.isFinite(convertido) ? convertido : 0;
};

const aFecha = (valor) => {
  if (valor === null || valor === undefined || valor === "") return null;
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
};

const usuarioSesion = (req) =>
  req.usuario ?? {
    id: String(req.headers["x-user-id"] ?? ""),
    nombre: String(req.headers["x-user-name"] ?? "Administrador"),
    rol: String(req.headers["x-user-role"] ?? ""),
  };

const entradaHistorial = ({
  tipo,
  estadoAnterior = null,
  estadoNuevo = null,
  nota = "",
  usuario,
  el = new Date(),
}) => ({
  Tipo: tipo,
  EstadoAnterior: estadoAnterior ?? "",
  EstadoNuevo: estadoNuevo ?? "",
  Por: usuario?.nombre || "Administrador",
  PorId: usuario?.id || "",
  El: el,
  Nota: nota,
});

const mapearSolicitante = (solicitante = {}) => ({
  Nombre: texto(solicitante?.nombre ?? solicitante?.Nombre),
  Cargo: texto(solicitante?.cargo ?? solicitante?.Cargo),
  Correo: texto(solicitante?.correo ?? solicitante?.Correo),
  Telefono: texto(solicitante?.telefono ?? solicitante?.Telefono),
});

const mapearPersonal = (personal) =>
  (Array.isArray(personal) ? personal : []).map((item) => ({
    RolId: texto(item?.rolId ?? item?.RolId),
    Rol: texto(item?.rol ?? item?.Rol),
    Cantidad: numero(item?.cantidad ?? item?.Cantidad),
    Horas: numero(item?.horas ?? item?.Horas),
    Notas: texto(item?.notas ?? item?.Notas),
  }));

const mapearEquipos = (equipos) =>
  (Array.isArray(equipos) ? equipos : []).map((item) => ({
    EquipoId: texto(item?.equipoId ?? item?.EquipoId),
    InventarioId: texto(item?.inventarioId ?? item?.InventarioId),
    Equipo: texto(item?.equipo ?? item?.Equipo),
    Placa: texto(item?.placa ?? item?.Placa),
    Descripcion: texto(item?.descripcion ?? item?.Descripcion),
    ImagenActualizadaEn: aFecha(
      item?.imagenActualizadaEn ?? item?.ImagenActualizadaEn
    ),
    Categoria: texto(item?.categoria ?? item?.Categoria),
    Subcategoria: texto(item?.subcategoria ?? item?.Subcategoria),
    Cantidad: numero(item?.cantidad ?? item?.Cantidad),
    Notas: texto(item?.notas ?? item?.Notas),
    Restricciones: (Array.isArray(item?.restricciones ?? item?.Restricciones)
      ? item.restricciones ?? item.Restricciones
      : []
    )
      .map((restriccion) => texto(restriccion?.texto ?? restriccion))
      .filter(Boolean),
    RestriccionesAceptadasPor: texto(
      item?.restriccionesAceptadasPor ?? item?.RestriccionesAceptadasPor
    ),
    RestriccionesAceptadasPorId: texto(
      item?.restriccionesAceptadasPorId ?? item?.RestriccionesAceptadasPorId
    ),
    RestriccionesAceptadasEl: aFecha(
      item?.restriccionesAceptadasEl ?? item?.RestriccionesAceptadasEl
    ),
  }));

/**
 * Completa las líneas con los datos vigentes del inventario. Es la fuente de
 * verdad para placa, categoría, descripción y restricciones; el frontend no
 * puede inventarlas.
 */
const enriquecerEquipos = async (equipos, { usuario, aceptaRestricciones = false } = {}) => {
  const lineas = mapearEquipos(equipos);
  if (lineas.length === 0) return [];

  const ids = lineas
    .map((linea) => linea.InventarioId || linea.EquipoId)
    .filter((id) => esObjectIdValido(id));

  const documentos = await Equipment.find({ _id: { $in: ids } })
    .populate("categoriaId", "nombre descripcion")
    .populate("subcategoriaId", "nombre descripcion")
    .lean();
  const porId = new Map(documentos.map((equipo) => [String(equipo._id), equipo]));

  return lineas.map((linea) => {
    const id = linea.InventarioId || linea.EquipoId;
    const equipo = porId.get(String(id));

    if (!equipo) return linea;

    const restricciones = textosRestricciones(equipo);
    const aceptada =
      restricciones.length > 0 &&
      (Boolean(aceptaRestricciones) ||
        Boolean(linea.RestriccionesAceptadasPor));

    return {
      ...linea,
      EquipoId: linea.EquipoId || String(equipo._id),
      InventarioId: String(equipo._id),
      Equipo: descripcionEquipo(equipo) || linea.Equipo,
      Placa: equipo.placa,
      Descripcion: descripcionEquipo(equipo),
      ImagenActualizadaEn: equipo.imagen?.actualizadaEn ?? null,
      Categoria: texto(equipo.categoriaId?.nombre) || linea.Categoria,
      Subcategoria:
        texto(equipo.subcategoriaId?.nombre) || linea.Subcategoria,
      Restricciones: restricciones,
      RestriccionesAceptadasPor: aceptada ? usuario?.nombre ?? "" : "",
      RestriccionesAceptadasPorId: aceptada ? usuario?.id ?? "" : "",
      RestriccionesAceptadasEl: aceptada ? new Date() : null,
    };
  });
};

const estadoHttpEquipos = (mensaje = "") =>
  /restriccion|no existe|no tiene|repetido|legado|placa real/i.test(mensaje)
    ? 400
    : 409;

/**
 * En creación/edición de un requerimiento pendiente solo se validan las
 * líneas que ya apuntan a inventario real. Las líneas legadas se conservan y
 * se bloquean al aprobar.
 */
const validarEquiposPendientes = async ({
  equipos,
  fechaClave,
  timeIn,
  timeOut,
  excluirId = null,
}) => {
  const reales = (Array.isArray(equipos) ? equipos : []).filter(
    (linea) =>
      esObjectIdValido(linea?.InventarioId) || esObjectIdValido(linea?.EquipoId)
  );

  if (reales.length === 0) return null;

  const validacion = await validarEquiposParaReserva({
    equipos: reales,
    fechaClave,
    timeIn,
    timeOut,
    excluirOrigen: excluirId
      ? { tipo: "Programmer", id: excluirId }
      : null,
  });

  return validacion.error;
};

const mapearCuerpo = (body = {}, { personalExistente = [] } = {}) => {
  const campos = {};

  const asignar = (clave, valor) => {
    if (valor !== undefined) campos[clave] = valor;
  };

  const asignarTexto = (clave, valor) => {
    if (valor !== undefined) campos[clave] = texto(valor);
  };

  asignarTexto("Nombre", body.nombre);
  asignarTexto("Observacion", body.observacion);
  asignar("Fecha_clave", body.fechaClave);
  asignar("Fecha_start", body.fechaStart);
  asignar("Fecha_end", body.fechaEnd);
  asignar("Time_in", body.timeIn);
  asignar("Time_out", body.timeOut);
  asignarTexto("Color", body.color);

  asignarTexto("Departamento", body.departamento);
  asignarTexto("Prioridad", body.prioridad);
  asignarTexto("TipoEvento", body.tipoEvento);
  asignarTexto("Programa", body.programa);
  asignarTexto("Locacion", body.locacion);
  asignarTexto("Descripcion", body.descripcion);

  if (body.solicitante !== undefined) {
    campos.Solicitante = mapearSolicitante(body.solicitante);
  }

  if (body.personal !== undefined) {
    const previos = new Map(
      (Array.isArray(personalExistente) ? personalExistente : []).map(
        (linea) => [String(linea?.RolId ?? ""), linea]
      )
    );

    campos.Personal = mapearPersonal(body.personal).map((linea) => ({
      ...linea,
      Asignados: previos.get(String(linea.RolId))?.Asignados ?? [],
    }));
  }

  if (body.equipos !== undefined) {
    campos.Equipos = mapearEquipos(body.equipos);
  }

  return campos;
};

const validarFechasBase = ({ fechaClave, fechaEnd }) => {
  const inicio = aFecha(fechaClave);
  if (!inicio) return "La fecha del evento es obligatoria";

  const fin = aFecha(fechaEnd ?? fechaClave);
  if (!fin) return "La fecha de vigencia no es válida";

  if (fin.getTime() < inicio.getTime()) {
    return "La vigencia no puede ser anterior a la fecha del evento";
  }

  return null;
};

const validarHoras = ({ timeIn, timeOut }) => {
  const inicio = aFecha(timeIn);
  const fin = aFecha(timeOut);

  if (!inicio || !fin) {
    return "Las horas de inicio y fin son obligatorias";
  }

  if (
    inicio.getUTCHours() * 60 + inicio.getUTCMinutes() ===
    fin.getUTCHours() * 60 + fin.getUTCMinutes()
  ) {
    return "La hora de fin debe ser distinta a la hora de inicio";
  }

  return null;
};

const validarNombreDuplicado = async ({ nombre, fechaClave, excluirId }) => {
  const rango = rangoDiaUtc(fechaClave);
  if (!rango) return "La fecha del evento no es válida";

  const query = {
    Fecha_clave: { $gte: rango.inicio, $lt: rango.fin },
    Estado: { $ne: "Rechazada" },
  };
  if (excluirId) query._id = { $ne: excluirId };

  const otros = await Programmers.find(query).select("Nombre").lean();
  const objetivo = normalizar(nombre);

  if (otros.some((otro) => normalizar(otro.Nombre) === objetivo)) {
    return "Ya existe un requerimiento con ese nombre para esa fecha";
  }

  return null;
};

const validarCodigo = async (codigo, excluirId = null) => {
  if (!codigo) return null;

  const query = { Codigo: codigo };
  if (excluirId) query._id = { $ne: excluirId };

  if (await Programmers.exists(query)) {
    return "Ya existe un requerimiento con ese código";
  }

  return null;
};

const validarDepartamento = async (nombre, anterior = "") => {
  const valor = texto(nombre);
  if (!valor) return null;

  const objetivo = normalizar(valor);
  const departamentos = await Department.find({}, "nombre").lean();

  if (
    departamentos.some(
      (departamento) => normalizar(departamento.nombre) === objetivo
    )
  ) {
    return null;
  }

  if (normalizar(anterior) === objetivo) return null;

  return "El departamento no existe. Créalo en Requirements → Administrar departamentos.";
};

const validarCapacidadGrupos = async (personal, personalExistente = []) => {
  const existentes = new Set(
    (Array.isArray(personalExistente) ? personalExistente : []).map((linea) =>
      String(linea?.RolId ?? "")
    )
  );

  for (const linea of Array.isArray(personal) ? personal : []) {
    const rolId = texto(linea?.RolId);
    if (!rolId) continue;

    let grupo = null;
    if (mongoose.isValidObjectId(rolId)) {
      grupo = await Groups.findById(rolId).lean();
    }

    if (!grupo) {
      if (!existentes.has(rolId)) {
        return `El grupo "${linea?.Rol || rolId}" no existe en el sistema`;
      }
      continue;
    }

    const personas = await Payroll.find({
      grupoID: rolId,
      activo: true,
    })
      .select("nombres apellidos cargo")
      .lean();

    const activos = personas.filter(
      (persona) =>
        String(persona?.cargo ?? "").trim().toUpperCase() !== "USERBALANCER"
    );

    if (numero(linea?.Cantidad) > activos.length) {
      return `El grupo "${grupo.nombre}" solo tiene ${activos.length} persona(s) activa(s) y se requieren ${numero(
        linea?.Cantidad
      )}`;
    }
  }

  return null;
};

const mismoGrupo = (a, b) => {
  if (a?.RolId && b?.RolId) {
    return String(a.RolId) === String(b.RolId);
  }
  return normalizar(a?.Rol) === normalizar(b?.Rol);
};

const validarCrucePersonal = async ({
  fechaClave,
  timeIn,
  timeOut,
  personal,
  excluirId,
}) => {
  const rango = rangoDiaUtc(fechaClave);
  const intervaloNuevo = intervaloEvento(fechaClave, timeIn, timeOut);

  if (!rango || !intervaloNuevo) return null;

  const filas = (Array.isArray(personal) ? personal : []).filter(
    (linea) => linea?.RolId || linea?.Rol
  );

  if (filas.length === 0) return null;

  const query = {
    Fecha_clave: { $gte: rango.inicio, $lt: rango.fin },
    Estado: { $ne: "Rechazada" },
  };
  if (excluirId) query._id = { $ne: excluirId };

  const otros = await Programmers.find(query)
    .select("Nombre Fecha_clave Time_in Time_out Personal Estado")
    .lean();

  for (const otro of otros) {
    const intervaloOtro = intervaloEvento(
      otro.Fecha_clave,
      otro.Time_in,
      otro.Time_out
    );

    if (!intervaloOtro || !hayCruce(intervaloNuevo, intervaloOtro)) continue;

    for (const filaNueva of filas) {
      for (const filaOtro of otro.Personal ?? []) {
        if (mismoGrupo(filaNueva, filaOtro)) {
          return `El grupo "${filaNueva.Rol || filaOtro.Rol}" ya está requerido en "${otro.Nombre}" con un horario que se cruza`;
        }
      }
    }
  }

  return null;
};

const validarCruceAsignados = async (actual, ids) => {
  const rango = rangoDiaUtc(actual.Fecha_clave);
  const intervalo = intervaloEvento(
    actual.Fecha_clave,
    actual.Time_in,
    actual.Time_out
  );

  if (!rango || !intervalo || ids.length === 0) return null;

  const otros = await Programmers.find({
    _id: { $ne: actual._id },
    Fecha_clave: { $gte: rango.inicio, $lt: rango.fin },
    Estado: { $ne: "Rechazada" },
  })
    .select("Nombre Fecha_clave Time_in Time_out Personal")
    .lean();

  for (const otro of otros) {
    const intervaloOtro = intervaloEvento(
      otro.Fecha_clave,
      otro.Time_in,
      otro.Time_out
    );

    if (!intervaloOtro || !hayCruce(intervalo, intervaloOtro)) continue;

    for (const linea of otro.Personal ?? []) {
      const persona = (linea.Asignados ?? []).find((asignado) =>
        ids.includes(String(asignado.Id))
      );

      if (persona) {
        return `${persona.Nombre} ya está asignado en "${otro.Nombre}" con un horario que se cruza`;
      }
    }
  }

  return null;
};

const fechaMs = (valor) => aFecha(valor)?.getTime() ?? null;

const cambioAgenda = (actual, { fechaClave, timeIn, timeOut }) => {
  return (
    fechaMs(actual.Fecha_clave) !== fechaMs(fechaClave) ||
    fechaMs(actual.Time_in) !== fechaMs(timeIn) ||
    fechaMs(actual.Time_out) !== fechaMs(timeOut)
  );
};

const firmaPersonal = (personal) =>
  (Array.isArray(personal) ? personal : [])
    .map(
      (linea) =>
        `${String(linea?.RolId ?? "")}:${Number(linea?.Cantidad ?? 0) || 0}`
    )
    .sort()
    .join("|");

//Crear un nuevo requerimiento manual
export const createProgrammer = async (req, res) => {
  const body = req.body ?? {};
  const usuario = usuarioSesion(req);
  const nombre = texto(body.nombre);

  try {
    if (!nombre) {
      return res.status(400).json({
        message: "El nombre del requerimiento es obligatorio",
      });
    }

    const errorFechas = validarFechasBase(body);
    if (errorFechas) {
      return res.status(400).json({ message: errorFechas });
    }

    const errorHoras = validarHoras(body);
    if (errorHoras) {
      return res.status(400).json({ message: errorHoras });
    }

    const errorNombre = await validarNombreDuplicado({
      nombre,
      fechaClave: body.fechaClave,
    });
    if (errorNombre) {
      return res.status(409).json({ message: errorNombre });
    }

    const errorDepartamento = await validarDepartamento(body.departamento);
    if (errorDepartamento) {
      return res.status(400).json({ message: errorDepartamento });
    }

    const personal = mapearPersonal(body.personal);
    const errorCruce = await validarCrucePersonal({
      fechaClave: body.fechaClave,
      timeIn: body.timeIn,
      timeOut: body.timeOut,
      personal,
    });
    if (errorCruce) {
      return res.status(409).json({ message: errorCruce });
    }

    const errorCapacidad = await validarCapacidadGrupos(personal);
    if (errorCapacidad) {
      return res.status(409).json({ message: errorCapacidad });
    }

    let codigo = texto(body.codigo);
    if (codigo) {
      const errorCodigo = await validarCodigo(codigo);
      if (errorCodigo) {
        return res.status(409).json({ message: errorCodigo });
      }
    } else {
      codigo = await generarCodigoProgrammer(body.fechaClave);
    }

    const campos = mapearCuerpo(body);

    if (campos.Equipos !== undefined) {
      campos.Equipos = await enriquecerEquipos(campos.Equipos, {
        usuario,
        aceptaRestricciones: body.aceptaRestricciones,
      });

      const errorEquipos = await validarEquiposPendientes({
        equipos: campos.Equipos,
        fechaClave: body.fechaClave,
        timeIn: body.timeIn,
        timeOut: body.timeOut,
      });

      if (errorEquipos) {
        return res
          .status(estadoHttpEquipos(errorEquipos))
          .json({ message: errorEquipos });
      }
    }

    const newProgrammer = new Programmers({
      ...campos,
      Nombre: nombre,
      Codigo: codigo,
      Fecha_clave: body.fechaClave,
      Fecha_start: body.fechaStart ?? body.fechaClave,
      Fecha_end: body.fechaEnd ?? body.fechaClave,
      Time_in: body.timeIn,
      Time_out: body.timeOut,
      Color: texto(body.color) || "#000000",
      Estado: "Pendiente",
      Prioridad: texto(body.prioridad) || "Media",
      Revision: 0,
      CreadoPor: usuario.nombre,
      CreadoPorId: usuario.id,
      Historial: [
        entradaHistorial({
          tipo: "creacion",
          estadoNuevo: "Pendiente",
          nota: "Requerimiento creado manualmente desde Programmer.",
          usuario,
        }),
      ],
    });

    const programmerSaved = await newProgrammer.save();

    broadcast("programmer:changed", {
      action: "created",
      id: String(programmerSaved._id),
      fechaClave: programmerSaved.Fecha_clave,
    });

    res.status(201).json(programmerSaved);
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        message: "El código del requerimiento ya existe",
      });
    }

    res.status(500).json({
      message: error.message || "Error intentando crear un nuevo programmer",
    });
  }
};

//Listar todos los registros
export const findProgrammersFull = async (req, res) => {
  try {
    const oneRegistro = await Programmers.find().sort({
      Fecha_clave: 1,
      Time_in: 1,
    });
    res.json(oneRegistro);
  } catch (error) {
    res.status(500).json({
      message: "error intentando listar la información",
    });
  }
};

//Listar registros por fecha clave, todos o solo aprobados/agendados
export const findProgrammerByDate = async (req, res) => {
  const fecha = req.query.fecha;
  const anioTexto = texto(req.query.anio);
  const todas = String(req.query.todas ?? "").toLowerCase() === "true";
  const soloAprobados =
    String(req.query.soloAprobados ?? "").toLowerCase() === "true";

  const rangoAnio = anioTexto ? rangoAnioUtc(anioTexto) : null;

  if (anioTexto && !rangoAnio) {
    return res.status(400).json({
      message: "El año enviado no es válido",
    });
  }

  try {
    const filtro = rangoAnio
      ? {
          Fecha_clave: {
            $gte: rangoAnio.inicio,
            $lt: rangoAnio.fin,
          },
        }
      : todas
        ? {}
        : { Fecha_clave: fecha };
    if (soloAprobados) {
      filtro.Estado = { $in: ["Aprobada", "Agendado"] };
    }

    const q = texto(req.query.q);
    if (q) {
      const patron = patronBusqueda(q);
      filtro.$or = [
        { Nombre: patron },
        { Codigo: patron },
        { Programa: patron },
        { TipoEvento: patron },
        { Locacion: patron },
        { Departamento: patron },
        { Descripcion: patron },
        { Observacion: patron },
        { "Solicitante.Nombre": patron },
      ];
    }

    const oneRegistro = await Programmers.find(filtro).sort({
      Fecha_clave: 1,
      Time_in: 1,
    });

    res.json(oneRegistro);
  } catch (error) {
    res.status(500).json({
      message: "error intentando listar la información",
    });
  }
};

//Años con requerimientos registrados (para el archivo)
export const findProgrammerYears = async (req, res) => {
  try {
    const anios = await Programmers.aggregate([
      { $match: { Fecha_clave: { $type: "date" } } },
      {
        $group: {
          _id: { $year: "$Fecha_clave" },
          total: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
      {
        $project: {
          _id: 0,
          anio: "$_id",
          total: 1,
        },
      },
    ]);

    res.json(anios);
  } catch (error) {
    res.status(500).json({
      message: "No se pudieron listar los años de requerimientos",
    });
  }
};

//Actualizar un requerimiento; si estaba decidido, vuelve a Pendiente
export const updateProgrammer = async (req, res) => {
  const { id } = req.params;
  const body = req.body ?? {};
  const usuario = usuarioSesion(req);

  try {
    const actual = await Programmers.findById(id);

    if (!actual) {
      return res.status(404).json({
        message: `El requerimiento con id ${id} no existe`,
      });
    }

    if (await tieneCustodiaActivaDeOrigen("Programmer", id)) {
      return res.status(409).json({
        message:
          "El requerimiento tiene equipos cargados a un trabajador. Descarga las Assignments antes de modificarlo.",
      });
    }

    const estadoAnterior = actual.Estado;
    const eraFinal = esEstadoFinal(estadoAnterior);

    if (
      body.revision === undefined ||
      Number(body.revision) !== Number(actual.Revision ?? 0)
    ) {
      return res.status(409).json({
        message:
          "El requerimiento fue modificado por otro usuario. Recarga la pantalla e intenta de nuevo.",
        revision: actual.Revision ?? 0,
      });
    }

    if (body.estado !== undefined && body.estado !== actual.Estado) {
      return res.status(400).json({
        message:
          "El estado se cambia con las acciones de aprobación, no desde la edición.",
      });
    }

    const nombre =
      body.nombre !== undefined ? texto(body.nombre) : texto(actual.Nombre);
    if (!nombre) {
      return res.status(400).json({
        message: "El nombre del requerimiento no puede quedar vacío",
      });
    }

    const fechaClave = body.fechaClave ?? actual.Fecha_clave;
    const fechaEnd = body.fechaEnd ?? actual.Fecha_end;
    const timeIn = body.timeIn ?? actual.Time_in;
    const timeOut = body.timeOut ?? actual.Time_out;

    const errorFechas = validarFechasBase({ fechaClave, fechaEnd });
    if (errorFechas) {
      return res.status(400).json({ message: errorFechas });
    }

    const errorHoras = validarHoras({ timeIn, timeOut });
    if (errorHoras) {
      return res.status(400).json({ message: errorHoras });
    }

    const errorNombre = await validarNombreDuplicado({
      nombre,
      fechaClave,
      excluirId: id,
    });
    if (errorNombre) {
      return res.status(409).json({ message: errorNombre });
    }

    const errorDepartamento = await validarDepartamento(
      body.departamento !== undefined ? body.departamento : actual.Departamento,
      actual.Departamento
    );
    if (errorDepartamento) {
      return res.status(400).json({ message: errorDepartamento });
    }

    const personal =
      body.personal !== undefined
        ? mapearPersonal(body.personal)
        : actual.Personal;

    const huboCambioPersonal =
      body.personal !== undefined &&
      firmaPersonal(personal) !== firmaPersonal(actual.Personal);
    const huboCambioAgenda = cambioAgenda(actual, {
      fechaClave,
      timeIn,
      timeOut,
    });

    const errorCruce = await validarCrucePersonal({
      fechaClave,
      timeIn,
      timeOut,
      personal,
      excluirId: id,
    });
    if (errorCruce) {
      return res.status(409).json({ message: errorCruce });
    }

    const errorCapacidad = await validarCapacidadGrupos(
      personal,
      actual.Personal
    );
    if (errorCapacidad) {
      return res.status(409).json({ message: errorCapacidad });
    }

    let codigoCambio = null;
    if (body.codigo !== undefined) {
      const codigo = texto(body.codigo);
      if (codigo && codigo !== actual.Codigo) {
        const errorCodigo = await validarCodigo(codigo, id);
        if (errorCodigo) {
          return res.status(409).json({ message: errorCodigo });
        }
        codigoCambio = codigo;
      }
    }

    const campos = mapearCuerpo(body, {
      personalExistente: actual.Personal,
    });

    if (campos.Equipos !== undefined) {
      campos.Equipos = await enriquecerEquipos(campos.Equipos, {
        usuario,
        aceptaRestricciones: body.aceptaRestricciones,
      });

      // El reemplazo puntual desde la ficha de Programmer puede dejar otras
      // líneas aún en conflicto. La disponibilidad definitiva se valida al
      // aprobar; aquí se permite guardar el cambio sin bloquear por las demás.
      if (body.omitirValidacionEquipos !== true) {
        const errorEquipos = await validarEquiposPendientes({
          equipos: campos.Equipos,
          fechaClave,
          timeIn,
          timeOut,
          excluirId: id,
        });

        if (errorEquipos) {
          return res
            .status(estadoHttpEquipos(errorEquipos))
            .json({ message: errorEquipos });
        }
      }
    }

    if (codigoCambio) campos.Codigo = codigoCambio;

    actual.set(campos);

    let asignacionesLimpiadas = false;

    if (eraFinal) {
      if (huboCambioAgenda || huboCambioPersonal) {
        (actual.Personal ?? []).forEach((linea) => {
          linea.Asignados = [];
        });
        asignacionesLimpiadas = true;
      }

      actual.Estado = "Pendiente";
      actual.DecididoPor = "";
      actual.DecididoPorId = "";
      actual.DecididoEn = null;
      actual.MotivoDecision = "";
    }

    actual.Revision = Number(actual.Revision ?? 0) + 1;
    actual.ActualizadoPor = usuario.nombre;
    actual.ActualizadoPorId = usuario.id;

    const notaBase =
      texto(body.notaCambio) ||
      (eraFinal
        ? "Requerimiento reabierto a Pendiente por edición."
        : "Requerimiento actualizado desde Programmer.");

    actual.Historial = [
      ...(Array.isArray(actual.Historial) ? actual.Historial : []),
      entradaHistorial({
        tipo: "actualizacion",
        estadoAnterior,
        estadoNuevo: actual.Estado,
        nota: asignacionesLimpiadas
          ? `${notaBase} Se limpiaron las asignaciones de personal porque cambiaron la agenda o los grupos.`
          : notaBase,
        usuario,
      }),
    ];

    const programmerSaved = await actual.save();

    if (eraFinal) {
      await liberarEquiposDeOrigen({
        origenTipo: "Programmer",
        origenId: id,
        usuario,
        motivo: "El requerimiento fue reabierto por edición",
      });

      try {
        await eliminarTurnosDirectosProgramador(id);
      } catch (errorDirecto) {
        console.error(
          "No se pudieron eliminar los turnos directos al reabrir:",
          errorDirecto
        );
      }
    }

    broadcast("programmer:changed", {
      action: "updated",
      id: String(programmerSaved._id),
      fechaClave: programmerSaved.Fecha_clave,
    });

    res.json(programmerSaved);
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        message: "El código del requerimiento ya existe",
      });
    }

    res.status(500).json({
      message: `error intentando actualizar el registro con id ${id}`,
    });
  }
};

//Aprobar, rechazar o solicitar revisión
export const decideProgrammer = async (req, res) => {
  const { id } = req.params;
  const { estadoNuevo, motivo, revision } = req.body ?? {};
  const usuario = usuarioSesion(req);

  try {
    const actual = await Programmers.findById(id);

    if (!actual) {
      return res.status(404).json({
        message: `El requerimiento con id ${id} no existe`,
      });
    }

    if (await tieneCustodiaActivaDeOrigen("Programmer", id)) {
      return res.status(409).json({
        message:
          "El requerimiento tiene equipos cargados a un trabajador. Descarga las Assignments antes de tomar una decisión.",
      });
    }

    if (!transicionDecisionValida(actual.Estado, estadoNuevo)) {
      return res.status(409).json({
        message: `No se puede pasar de "${actual.Estado}" a "${estadoNuevo}"`,
      });
    }

    if (
      revision === undefined ||
      Number(revision) !== Number(actual.Revision ?? 0)
    ) {
      return res.status(409).json({
        message:
          "El requerimiento fue modificado por otro usuario. Recarga la pantalla e intenta de nuevo.",
        revision: actual.Revision ?? 0,
      });
    }

    const motivoFinal = texto(motivo);
    if (motivoObligatorio(estadoNuevo) && !motivoFinal) {
      return res.status(400).json({
        message:
          estadoNuevo === "Rechazada"
            ? "Escribe el motivo del rechazo"
            : "Escribe las anotaciones para solicitar la revisión",
      });
    }

    let reservas = null;

    if (estadoNuevo === "Aprobada") {
      const errorCruce = await validarCrucePersonal({
        fechaClave: actual.Fecha_clave,
        timeIn: actual.Time_in,
        timeOut: actual.Time_out,
        personal: actual.Personal,
        excluirId: id,
      });
      if (errorCruce) {
        return res.status(409).json({ message: errorCruce });
      }

      const equiposParaReservar = (actual.Equipos ?? []).map((linea) => ({
        ...(typeof linea.toObject === "function" ? linea.toObject() : linea),
        aceptaRestricciones: Boolean(req.body?.aceptaRestricciones),
      }));

      reservas = await reservarEquiposParaOrigen({
        equipos: equiposParaReservar,
        fechaClave: actual.Fecha_clave,
        timeIn: actual.Time_in,
        timeOut: actual.Time_out,
        origenTipo: "Programmer",
        origenId: actual._id,
        origenCodigo: actual.Codigo,
        origenNombre: actual.Nombre,
        usuario,
      });

      if (reservas.error) {
        return res
          .status(estadoHttpEquipos(reservas.error))
          .json({ message: reservas.error });
      }

      if (req.body?.aceptaRestricciones) {
        (actual.Equipos ?? []).forEach((linea) => {
          if ((linea.Restricciones ?? []).length === 0) return;
          linea.RestriccionesAceptadasPor = usuario.nombre;
          linea.RestriccionesAceptadasPorId = usuario.id;
          linea.RestriccionesAceptadasEl = new Date();
        });
      }
    }

    const estadoAnterior = actual.Estado;
    const estadoFinal =
      estadoNuevo === "Aprobada" ? estadoAprobado(actual.Personal) : estadoNuevo;
    actual.Estado = estadoFinal;
    actual.DecididoPor = usuario.nombre;
    actual.DecididoPorId = usuario.id;
    actual.DecididoEn = new Date();
    actual.MotivoDecision = motivoFinal;
    actual.ActualizadoPor = usuario.nombre;
    actual.ActualizadoPorId = usuario.id;
    actual.Revision = Number(actual.Revision ?? 0) + 1;

    const tipo =
      estadoFinal === "Agendado"
        ? "agendamiento"
        : estadoFinal === "Aprobada"
          ? "aprobacion"
          : estadoFinal === "Rechazada"
            ? "rechazo"
            : "revision";

    actual.Historial = [
      ...(Array.isArray(actual.Historial) ? actual.Historial : []),
      entradaHistorial({
        tipo,
        estadoAnterior,
        estadoNuevo: estadoFinal,
        nota:
          motivoFinal ||
          (estadoFinal === "Agendado"
            ? "Requerimiento aprobado y agendado."
            : estadoFinal === "Aprobada"
              ? "Requerimiento aprobado."
              : "Requerimiento actualizado."),
        usuario,
      }),
    ];

    let programmerSaved;
    try {
      programmerSaved = await actual.save();
    } catch (error) {
      if (reservas?.asignaciones?.length) {
        await liberarEquiposDeOrigen({
          origenTipo: "Programmer",
          origenId: id,
          usuario,
          motivo: "Error al guardar la aprobación",
        });
      }
      throw error;
    }

    if (["Aprobada", "Agendado"].includes(estadoFinal)) {
      try {
        await asegurarTurnosDirectosProgramador(programmerSaved);
      } catch (errorDirecto) {
        console.error(
          "No se pudieron asegurar los turnos directos del Programmer:",
          errorDirecto
        );
      }
    }

    if (estadoNuevo !== "Aprobada") {
      await liberarEquiposDeOrigen({
        origenTipo: "Programmer",
        origenId: id,
        usuario,
        motivo: motivoFinal || `Requerimiento ${estadoNuevo.toLowerCase()}`,
      });
    }

    broadcast("programmer:changed", {
      action: "decided",
      id: String(programmerSaved._id),
      estado: estadoFinal,
      fechaClave: programmerSaved.Fecha_clave,
    });

    res.json(programmerSaved);
  } catch (error) {
    res.status(500).json({
      message: `error intentando decidir el requerimiento con id ${id}`,
    });
  }
};

//Asignar personal real a una línea del requerimiento
export const assignProgrammerPersonnel = async (req, res) => {
  const { id, rolId } = req.params;
  const { asignados, revision } = req.body ?? {};
  const usuario = usuarioSesion(req);

  try {
    const actual = await Programmers.findById(id);

    if (!actual) {
      return res.status(404).json({
        message: `El requerimiento con id ${id} no existe`,
      });
    }

    if (!permiteAsignarPersonal(actual.Estado)) {
      return res.status(409).json({
        message: "El requerimiento rechazado no permite asignaciones",
      });
    }

    const estadoAnterior = actual.Estado;

    if (
      revision === undefined ||
      Number(revision) !== Number(actual.Revision ?? 0)
    ) {
      return res.status(409).json({
        message:
          "El requerimiento fue modificado por otro usuario. Recarga la pantalla e intenta de nuevo.",
        revision: actual.Revision ?? 0,
      });
    }

    const linea = (actual.Personal ?? []).find(
      (item) => String(item.RolId) === String(rolId)
    );

    if (!linea) {
      return res.status(404).json({
        message: "El grupo requerido no existe en el requerimiento",
      });
    }

    if (!Array.isArray(asignados)) {
      return res.status(400).json({
        message: "Debes enviar la lista de personas asignadas",
      });
    }

    const ids = [
      ...new Set(
        asignados
          .map((item) => String(item?.id ?? item?.Id ?? "").trim())
          .filter(Boolean)
      ),
    ];

    if (ids.length > numero(linea.Cantidad)) {
      return res.status(400).json({
        message: `Solo puedes asignar ${numero(linea.Cantidad)} persona(s) a este grupo`,
      });
    }

    if (ids.some((item) => !mongoose.isValidObjectId(item))) {
      return res.status(400).json({
        message: "La lista de personas contiene identificadores inválidos",
      });
    }

    const personas = await Payroll.find({
      _id: { $in: ids },
      grupoID: String(rolId),
      activo: true,
    }).lean();

    const validas = personas.filter(
      (persona) =>
        String(persona?.cargo ?? "").trim().toUpperCase() !== "USERBALANCER"
    );

    if (validas.length !== ids.length) {
      return res.status(400).json({
        message:
          "Algunas personas no pertenecen al grupo, están inactivas o son usuarios de balanceo",
      });
    }

    const anterioresIds = new Set(
      (linea.Asignados ?? []).map((asignado) => String(asignado.Id))
    );
    const removidos = [...anterioresIds].filter((idActual) => !ids.includes(idActual));

    if (removidos.length > 0) {
      const custodias = await custodiasActivasDeOrigen("Programmer", id);
      const conCustodia = new Set(
        custodias.map((custodia) => String(custodia.trabajadorId))
      );

      if (removidos.some((idRemovido) => conCustodia.has(idRemovido))) {
        return res.status(409).json({
          message:
            "No puedes quitar a un trabajador con una Assignment activa. Descarga sus equipos primero.",
        });
      }
    }

    const errorCruce = await validarCruceAsignados(actual, ids);
    if (errorCruce) {
      return res.status(409).json({ message: errorCruce });
    }

    const yaEnOtraLinea = (actual.Personal ?? []).some(
      (otraLinea) =>
        String(otraLinea.RolId) !== String(rolId) &&
        (otraLinea.Asignados ?? []).some((asignado) =>
          ids.includes(String(asignado.Id))
        )
    );

    if (yaEnOtraLinea) {
      return res.status(409).json({
        message:
          "Una persona no puede estar asignada a dos grupos del mismo requerimiento",
      });
    }

    const anteriores = new Map(
      (Array.isArray(linea.Asignados) ? linea.Asignados : []).map(
        (asignado) => [String(asignado.Id), asignado]
      )
    );

    linea.Asignados = validas.map((persona) => ({
      Id: String(persona._id),
      Nombre: `${persona.nombres ?? ""} ${persona.apellidos ?? ""}`.trim(),
      Cargo: persona.cargo ?? "",
      GrupoId: String(rolId),
      AsignadoEl: new Date(),
      AsignadoPor: usuario.nombre,
      AsignadoPorId: usuario.id,
      Origen: anteriores.get(String(persona._id))?.Origen || "manual",
    }));

    const estadoNuevo = estadoTrasAsignacion(estadoAnterior, actual.Personal);
    actual.Estado = estadoNuevo;
    actual.Revision = Number(actual.Revision ?? 0) + 1;
    actual.ActualizadoPor = usuario.nombre;
    actual.ActualizadoPorId = usuario.id;
    actual.Historial = [
      ...(Array.isArray(actual.Historial) ? actual.Historial : []),
      entradaHistorial({
        tipo:
          estadoAnterior !== estadoNuevo && estadoNuevo === "Agendado"
            ? "agendamiento"
            : "asignacion",
        estadoAnterior,
        estadoNuevo,
        nota:
          validas.length > 0
            ? `Personal asignado al grupo "${linea.Rol || linea.RolId}": ${linea.Asignados.map(
                (persona) => persona.Nombre
              ).join(", ")}.${
                estadoAnterior !== estadoNuevo
                  ? ` Estado: ${estadoAnterior} → ${estadoNuevo}.`
                  : ""
              }`
            : `Se liberó el personal del grupo "${linea.Rol || linea.RolId}".${
                estadoAnterior !== estadoNuevo
                  ? ` Estado: ${estadoAnterior} → ${estadoNuevo}.`
                  : ""
              }`,
        usuario,
      }),
    ];

    const programmerSaved = await actual.save();

    if (["Aprobada", "Agendado"].includes(estadoNuevo)) {
      try {
        await asegurarTurnosDirectosProgramador(programmerSaved);
      } catch (errorDirecto) {
        console.error(
          "No se pudieron asegurar los turnos directos del Programmer:",
          errorDirecto
        );
      }
    }

    const idsRemovidos = [...anteriores.keys()].filter(
      (idAsignado) =>
        !(linea.Asignados ?? []).some(
          (asignado) => String(asignado.Id) === String(idAsignado)
        )
    );

    for (const idRemovido of idsRemovidos) {
      const sigueAsignado = (actual.Personal ?? []).some((otraLinea) =>
        (otraLinea.Asignados ?? []).some(
          (asignado) => String(asignado.Id) === String(idRemovido)
        )
      );

      if (sigueAsignado) continue;

      try {
        await eliminarTurnoDirectoProgramador({
          programmerId: actual._id,
          workerId: idRemovido,
        });
      } catch (errorDirecto) {
        console.error(
          "No se pudo eliminar el turno directo del Programmer:",
          errorDirecto
        );
      }
    }

    broadcast("programmer:changed", {
      action: "assigned",
      id: String(programmerSaved._id),
      estado: estadoNuevo,
      fechaClave: programmerSaved.Fecha_clave,
    });

    res.json(programmerSaved);
  } catch (error) {
    res.status(500).json({
      message: "No se pudo actualizar la asignación de personal",
    });
  }
};

//Eliminar requerimiento por id
export const deleteProgrammer = async (req, res) => {
  const { idP } = req.params;

  try {
    const actual = await Programmers.findById(idP);

    if (!actual) {
      return res.status(404).json({
        message: `El requerimiento con id ${idP} no existe`,
      });
    }

    if (await tieneCustodiaActivaDeOrigen("Programmer", actual._id)) {
      return res.status(409).json({
        message:
          "El requerimiento tiene equipos cargados a un trabajador. Descarga las Assignments antes de eliminarlo.",
      });
    }

    await liberarEquiposDeOrigen({
      origenTipo: "Programmer",
      origenId: actual._id,
      usuario: usuarioSesion(req),
      motivo: "El requerimiento fue eliminado",
    });

    try {
      await eliminarTurnosDirectosProgramador(actual._id);
    } catch (errorDirecto) {
      console.error(
        "No se pudieron eliminar los turnos directos al borrar:",
        errorDirecto
      );
    }

    await Programmers.findByIdAndDelete(idP);

    broadcast("programmer:changed", {
      action: "deleted",
      id: String(actual._id),
      fechaClave: actual.Fecha_clave,
    });

    res.json({
      message: `Requerimiento con id ${idP} eliminado correctamente`,
    });
  } catch (error) {
    res.status(500).json({
      message: `error eliminando el requerimiento con id ${idP}`,
    });
  }
};
