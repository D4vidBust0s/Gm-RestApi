/*
  API de Requirements: sistema de solicitudes por áreas.

  Es independiente de Programmer (proceso manual). Ambos comparten el servicio
  de reservas de equipos, pero sus colecciones, ciclos y registros son
  distintos.
*/

import mongoose from "mongoose";

import Department from "../models/Department";
import Equipment from "../models/Equipment";
import Groups from "../models/Groups";
import Payroll from "../models/Payroll";
import Requirement from "../models/Requirement";
import { broadcast } from "../realtime";
import { generarCodigoRequirement } from "../utils/requirementCode";
import {
  esEstadoFinal,
  estadoAprobado,
  estadoTrasAsignacion,
  motivoObligatorio,
  permiteAsignarPersonal,
  rangoAnioUtc,
  rangoDiaUtc,
  transicionDecisionValida,
} from "../utils/programmerRules";
import { descripcionEquipo, textosRestricciones } from "../utils/equipmentRules";
import {
  custodiasActivasDeOrigen,
  tieneCustodiaActivaDeOrigen,
} from "../utils/equipmentCustody";
import {
  liberarEquiposDeOrigen,
  normalizarLineaEquipo,
  reservarEquiposParaOrigen,
  validarEquiposParaReserva,
} from "../utils/equipmentReservations";

const texto = (valor) => String(valor ?? "").trim();

const numero = (valor) => {
  const convertido = Number(valor);
  return Number.isFinite(convertido) ? convertido : 0;
};

const normalizar = (valor) =>
  texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const escaparRegex = (valor) =>
  String(valor ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const usuarioSesion = (req) =>
  req.usuario ?? {
    id: texto(req.headers["x-user-id"]),
    nombre: texto(req.headers["x-user-name"]) || "Administrador",
    rol: texto(req.headers["x-user-role"]),
  };

const parseFechaLocal = (valor) => {
  if (valor === null || valor === undefined || valor === "") return null;

  if (valor instanceof Date) {
    if (Number.isNaN(valor.getTime())) return null;
    return new Date(valor.getFullYear(), valor.getMonth(), valor.getDate());
  }

  const soloDia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto(valor));
  if (soloDia) {
    const anio = Number(soloDia[1]);
    const mes = Number(soloDia[2]);
    const dia = Number(soloDia[3]);
    const fecha = new Date(anio, mes - 1, dia);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }

  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return null;
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
};

const construirFechaHora = (fechaValor, hora) => {
  const fecha = parseFechaLocal(fechaValor);
  if (!fecha) return null;

  const coincidencia = /^(\d{2}):(\d{2})$/.exec(texto(hora));
  if (!coincidencia) return null;

  return new Date(
    fecha.getFullYear(),
    fecha.getMonth(),
    fecha.getDate(),
    Number(coincidencia[1]),
    Number(coincidencia[2]),
    0,
    0
  );
};

const entradaHistorial = ({
  tipo,
  estadoAnterior = "",
  estadoNuevo = "",
  nota = "",
  usuario,
  el = new Date(),
}) => ({
  tipo,
  estadoAnterior,
  estadoNuevo,
  por: usuario?.nombre || "Administrador",
  porId: usuario?.id || "",
  el,
  nota,
});

const mapearSolicitante = (solicitante = {}) => ({
  nombre: texto(solicitante?.nombre),
  cargo: texto(solicitante?.cargo),
  correo: texto(solicitante?.correo),
  telefono: texto(solicitante?.telefono),
});

const mapearPersonal = (personal = []) =>
  (Array.isArray(personal) ? personal : []).map((item) => ({
    rolId: texto(item?.rolId),
    rol: texto(item?.rol),
    cantidad: numero(item?.cantidad),
    horas: numero(item?.horas),
    notas: texto(item?.notas),
    asignados: Array.isArray(item?.asignados) ? item.asignados : [],
  }));

const validarPersonal = async (personal, anteriores = []) => {
  const porRol = new Map(
    (Array.isArray(anteriores) ? anteriores : []).map((linea) => [
      String(linea?.rolId ?? ""),
      linea,
    ])
  );

  for (const linea of personal) {
    if (!linea.rolId) {
      return "Cada línea de personal debe tener un grupo válido";
    }

    if (!mongoose.isValidObjectId(linea.rolId)) {
      return `El grupo "${linea.rol || linea.rolId}" no es válido`;
    }

    const grupo = await Groups.findById(linea.rolId).lean();
    if (!grupo) {
      return `El grupo "${linea.rol || linea.rolId}" no existe`;
    }

    if (linea.cantidad <= 0) {
      return `El grupo "${grupo.nombre}" debe requerir al menos una persona`;
    }

    const personas = await Payroll.find({
      grupoID: String(linea.rolId),
      activo: true,
    })
      .select("nombres apellidos cargo")
      .lean();

    const activas = personas.filter(
      (persona) =>
        String(persona?.cargo ?? "").trim().toUpperCase() !== "USERBALANCER"
    );

    if (linea.cantidad > activas.length) {
      return `El grupo "${grupo.nombre}" solo tiene ${activas.length} persona(s) activa(s)`;
    }

    const previos = porRol.get(String(linea.rolId))?.asignados ?? [];
    if (previos.length > linea.cantidad) {
      return `El grupo "${grupo.nombre}" tiene más personas asignadas que cupos`;
    }
  }

  return null;
};

const prepararEquipos = async (equipos, { usuario, aceptaRestricciones = false }) => {
  const lineas = (Array.isArray(equipos) ? equipos : [])
    .map(normalizarLineaEquipo)
    .filter((linea) => linea.inventarioId || linea.placa || linea.descripcion);

  if (lineas.length === 0) return { equipos: [], error: null };

  const ids = [...new Set(lineas.map((linea) => linea.inventarioId))];

  for (const id of ids) {
    if (!mongoose.isValidObjectId(id)) {
      return {
        equipos: [],
        error:
          "Una línea de equipo no tiene una placa real de GM-Activos. Selecciona un equipo del inventario.",
      };
    }
  }

  const documentos = await Equipment.find({ _id: { $in: ids } })
    .populate("categoriaId", "nombre descripcion")
    .populate("subcategoriaId", "nombre descripcion")
    .lean();

  const porId = new Map(documentos.map((equipo) => [String(equipo._id), equipo]));

  const resultado = [];

  for (const linea of lineas) {
    const equipo = porId.get(String(linea.inventarioId));
    if (!equipo) {
      return {
        equipos: [],
        error: `El equipo "${linea.placa || linea.inventarioId}" no existe en el inventario`,
      };
    }

    const restricciones = textosRestricciones(equipo);
    const aceptada = Boolean(aceptaRestricciones) || Boolean(linea.restriccionesAceptadasPor);

    resultado.push({
      inventarioId: equipo._id,
      placa: equipo.placa,
      categoria: texto(equipo.categoriaId?.nombre),
      subcategoria: texto(equipo.subcategoriaId?.nombre),
      descripcion: descripcionEquipo(equipo),
      imagenActualizadaEn: equipo.imagen?.actualizadaEn ?? null,
      restricciones,
      restriccionesAceptadasPor: aceptada ? usuario.nombre : "",
      restriccionesAceptadasPorId: aceptada ? usuario.id : "",
      restriccionesAceptadasEl: aceptada ? new Date() : null,
      cantidad: 1,
      notas: linea.notas,
      estadoInventario: "Pendiente",
    });
  }

  return { equipos: resultado, error: null };
};

const estadoHttpEquipos = (mensaje = "") =>
  /restriccion|no existe|no tiene|repetido|legado|placa real/i.test(mensaje)
    ? 400
    : 409;

const validarNombreDepartamento = async (departamentoId) => {
  if (!mongoose.isValidObjectId(departamentoId)) {
    return { error: "Selecciona un departamento válido" };
  }

  const departamento = await Department.findById(departamentoId).lean();
  if (!departamento) {
    return { error: "El departamento no existe" };
  }

  return { departamento, error: null };
};

const validarFechas = ({ fechaClave, horaInicio, horaFin, timeIn, timeOut }) => {
  if (!fechaClave) return "La fecha del evento es obligatoria";

  const inicio = timeIn || construirFechaHora(fechaClave, horaInicio);
  const fin = timeOut || construirFechaHora(fechaClave, horaFin);

  if (!inicio || !fin) return "Las horas de inicio y fin son obligatorias";
  if (new Date(fin).getTime() === new Date(inicio).getTime()) {
    return "La hora de fin debe ser distinta a la hora de inicio";
  }

  return null;
};

const resolverIntervalo = ({ fechaClave, horaInicio, horaFin, timeIn, timeOut }) => ({
  timeIn: timeIn || construirFechaHora(fechaClave, horaInicio),
  timeOut: timeOut || construirFechaHora(fechaClave, horaFin),
});

const validarNombreDuplicado = async ({ nombre, fechaClave, excluirId = null }) => {
  const rango = rangoDiaUtc(fechaClave);
  if (!rango) return null;

  const query = {
    "evento.fecha": { $gte: rango.inicio, $lt: rango.fin },
    estado: { $ne: "Rechazada" },
  };
  if (excluirId) query._id = { $ne: excluirId };

  const otras = await Requirement.find(query).select("nombre").lean();
  if (otras.some((otra) => normalizar(otra.nombre) === normalizar(nombre))) {
    return "Ya existe una solicitud con ese nombre para esa fecha";
  }

  return null;
};

export const findRequirements = async (req, res) => {
  try {
    const filtro = {};
    const estado = texto(req.query.estado);
    const soloAprobadas =
      String(req.query.soloAprobadas ?? "").toLowerCase() === "true";
    const departamentoId = texto(req.query.departamentoId);
    const anio = texto(req.query.anio);
    const q = texto(req.query.q);

    if (estado === "Aprobada") {
      // Agendado también está aprobado: los consumidores operativos
      // (GM-Activos) deben recibir ambos estados.
      filtro.estado = { $in: ["Aprobada", "Agendado"] };
    } else if (estado) {
      filtro.estado = estado;
    }

    if (soloAprobadas) {
      filtro.estado = { $in: ["Aprobada", "Agendado"] };
    }
    if (departamentoId && mongoose.isValidObjectId(departamentoId)) {
      filtro.departamentoId = departamentoId;
    }

    if (anio) {
      const rango = rangoAnioUtc(anio);
      if (!rango) {
        return res.status(400).json({ message: "El año enviado no es válido" });
      }
      filtro["evento.fecha"] = { $gte: rango.inicio, $lt: rango.fin };
    }

    if (q) {
      const patron = new RegExp(escaparRegex(q), "i");
      filtro.$or = [
        { nombre: patron },
        { codigo: patron },
        { departamentoNombre: patron },
        { "solicitante.nombre": patron },
        { descripcion: patron },
        { "evento.programa": patron },
      ];
    }

    const solicitudes = await Requirement.find(filtro)
      .sort({ "evento.fecha": -1, createdAt: -1 })
      .lean();

    res.json(solicitudes);
  } catch (error) {
    res.status(500).json({
      message: error?.message || "No se pudieron listar las solicitudes",
    });
  }
};

export const findRequirementYears = async (req, res) => {
  try {
    const anios = await Requirement.aggregate([
      { $match: { "evento.fecha": { $type: "date" } } },
      {
        $group: {
          _id: { $year: "$evento.fecha" },
          total: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
      { $project: { _id: 0, anio: "$_id", total: 1 } },
    ]);

    res.json(anios);
  } catch (error) {
    res.status(500).json({
      message: error?.message || "No se pudieron listar los años",
    });
  }
};

export const findRequirementSummary = async (req, res) => {
  try {
    const porDepartamento = await Requirement.aggregate([
      {
        $group: {
          _id: "$departamentoId",
          nombre: { $first: "$departamentoNombre" },
          total: { $sum: 1 },
          pendientes: {
            $sum: { $cond: [{ $in: ["$estado", ["Pendiente", "En revisión"]] }, 1, 0] },
          },
          aprobadas: {
            $sum: {
              $cond: [
                { $in: ["$estado", ["Aprobada", "Agendado"]] },
                1,
                0,
              ],
            },
          },
          agendadas: { $sum: { $cond: [{ $eq: ["$estado", "Agendado"] }, 1, 0] } },
          rechazadas: { $sum: { $cond: [{ $eq: ["$estado", "Rechazada"] }, 1, 0] } },
        },
      },
      { $sort: { nombre: 1 } },
    ]);

    const total = await Requirement.countDocuments();

    res.json({ total, porDepartamento });
  } catch (error) {
    res.status(500).json({
      message: error?.message || "No se pudo calcular el resumen",
    });
  }
};

export const findRequirementById = async (req, res) => {
  try {
    const solicitud = await Requirement.findById(req.params.id).lean();
    if (!solicitud) {
      return res.status(404).json({ message: "La solicitud no existe" });
    }
    res.json(solicitud);
  } catch (error) {
    res.status(500).json({
      message: error?.message || "No se pudo consultar la solicitud",
    });
  }
};

export const createRequirement = async (req, res) => {
  const body = req.body ?? {};
  const usuario = usuarioSesion(req);
  const nombre = texto(body.nombre);
  const fechaClave = parseFechaLocal(body.evento?.fecha);

  if (!nombre) {
    return res.status(400).json({ message: "El nombre es obligatorio" });
  }
  if (!fechaClave) {
    return res.status(400).json({ message: "La fecha del evento es obligatoria" });
  }

  const horas = resolverIntervalo({
    fechaClave,
    horaInicio: body.evento?.horaInicio,
    horaFin: body.evento?.horaFin,
    timeIn: body.timeIn,
    timeOut: body.timeOut,
  });

  const errorFechas = validarFechas({
    fechaClave,
    horaInicio: body.evento?.horaInicio,
    horaFin: body.evento?.horaFin,
    timeIn: horas.timeIn,
    timeOut: horas.timeOut,
  });
  if (errorFechas) {
    return res.status(400).json({ message: errorFechas });
  }

  try {
    const { departamento, error: errorDepartamento } =
      await validarNombreDepartamento(body.departamentoId);
    if (errorDepartamento) {
      return res.status(400).json({ message: errorDepartamento });
    }

    const errorNombre = await validarNombreDuplicado({ nombre, fechaClave });
    if (errorNombre) {
      return res.status(409).json({ message: errorNombre });
    }

    const personal = mapearPersonal(body.personal).map((linea) => ({
      ...linea,
      asignados: [],
    }));
    const errorPersonal = await validarPersonal(personal);
    if (errorPersonal) {
      return res.status(400).json({ message: errorPersonal });
    }

    const preparado = await prepararEquipos(body.equipos, {
      usuario,
      aceptaRestricciones: Boolean(body.aceptaRestricciones),
    });
    if (preparado.error) {
      return res.status(400).json({ message: preparado.error });
    }

    const validacionEquipos = await validarEquiposParaReserva({
      equipos: preparado.equipos,
      fechaClave,
      timeIn: horas.timeIn,
      timeOut: horas.timeOut,
    });
    if (validacionEquipos.error) {
      return res
        .status(estadoHttpEquipos(validacionEquipos.error))
        .json({ message: validacionEquipos.error });
    }

    const codigo = await generarCodigoRequirement(fechaClave);

    const solicitud = new Requirement({
      codigo,
      nombre,
      departamentoId: departamento._id,
      departamentoNombre: departamento.nombre,
      evento: {
        programa: texto(body.evento?.programa),
        tipoEvento: texto(body.evento?.tipoEvento),
        fecha: fechaClave,
        horaInicio: texto(body.evento?.horaInicio),
        horaFin: texto(body.evento?.horaFin),
        locacion: texto(body.evento?.locacion),
      },
      personal,
      equipos: preparado.equipos,
      prioridad: texto(body.prioridad) || "Media",
      estado: "Pendiente",
      solicitante: mapearSolicitante(body.solicitante),
      descripcion: texto(body.descripcion),
      observacion: texto(body.observacion),
      revision: 0,
      creadoPor: usuario.nombre,
      creadoPorId: usuario.id,
      historial: [
        entradaHistorial({
          tipo: "creacion",
          estadoNuevo: "Pendiente",
          nota: `Solicitud creada para el área ${departamento.nombre}.`,
          usuario,
        }),
      ],
    });

    const guardada = await solicitud.save();

    broadcast("requirements:changed", {
      action: "created",
      id: String(guardada._id),
    });

    res.status(201).json(guardada);
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        message: "El código de la solicitud ya existe",
      });
    }
    res.status(500).json({
      message: error?.message || "No se pudo crear la solicitud",
    });
  }
};

export const updateRequirement = async (req, res) => {
  const { id } = req.params;
  const body = req.body ?? {};
  const usuario = usuarioSesion(req);

  try {
    const actual = await Requirement.findById(id);
    if (!actual) {
      return res.status(404).json({ message: "La solicitud no existe" });
    }

    if (await tieneCustodiaActivaDeOrigen("Requirement", id)) {
      return res.status(409).json({
        message:
          "La solicitud tiene equipos cargados a un trabajador. Descarga las Assignments antes de modificarla.",
      });
    }

    if (
      body.revision === undefined ||
      Number(body.revision) !== Number(actual.revision ?? 0)
    ) {
      return res.status(409).json({
        message:
          "La solicitud fue modificada por otro usuario. Recarga e intenta de nuevo.",
        revision: actual.revision ?? 0,
      });
    }

    if (body.estado !== undefined && body.estado !== actual.estado) {
      return res.status(400).json({
        message:
          "El estado se cambia con las acciones de aprobación, no desde la edición.",
      });
    }

    const estadoAnterior = actual.estado;
    const eraFinal = esEstadoFinal(estadoAnterior);

    const nombre = body.nombre !== undefined ? texto(body.nombre) : texto(actual.nombre);
    if (!nombre) {
      return res.status(400).json({ message: "El nombre no puede quedar vacío" });
    }

    const fechaClave =
      body.evento?.fecha !== undefined
        ? parseFechaLocal(body.evento.fecha)
        : actual.evento?.fecha;

    if (!fechaClave) {
      return res.status(400).json({ message: "La fecha del evento es obligatoria" });
    }

    const horaInicio =
      body.evento?.horaInicio !== undefined
        ? texto(body.evento.horaInicio)
        : actual.evento?.horaInicio;
    const horaFin =
      body.evento?.horaFin !== undefined
        ? texto(body.evento.horaFin)
        : actual.evento?.horaFin;

    const horas = resolverIntervalo({
      fechaClave,
      horaInicio,
      horaFin,
      timeIn: body.timeIn,
      timeOut: body.timeOut,
    });

    const errorFechas = validarFechas({
      fechaClave,
      horaInicio,
      horaFin,
      timeIn: horas.timeIn,
      timeOut: horas.timeOut,
    });
    if (errorFechas) {
      return res.status(400).json({ message: errorFechas });
    }

    const errorNombre = await validarNombreDuplicado({
      nombre,
      fechaClave,
      excluirId: id,
    });
    if (errorNombre) {
      return res.status(409).json({ message: errorNombre });
    }

    const departamentoId =
      body.departamentoId !== undefined
        ? body.departamentoId
        : String(actual.departamentoId);
    const { departamento, error: errorDepartamento } =
      await validarNombreDepartamento(departamentoId);
    if (errorDepartamento) {
      return res.status(400).json({ message: errorDepartamento });
    }

    let personal = actual.personal;
    if (body.personal !== undefined) {
      personal = mapearPersonal(body.personal).map((linea) => ({
        ...linea,
        asignados:
          actual.personal?.find(
            (anterior) => String(anterior.rolId) === String(linea.rolId)
          )?.asignados ?? [],
      }));

      const errorPersonal = await validarPersonal(personal, actual.personal);
      if (errorPersonal) {
        return res.status(400).json({ message: errorPersonal });
      }
    }

    let equipos = actual.equipos;
    if (body.equipos !== undefined) {
      const preparado = await prepararEquipos(body.equipos, {
        usuario,
        aceptaRestricciones: Boolean(body.aceptaRestricciones),
      });
      if (preparado.error) {
        return res.status(400).json({ message: preparado.error });
      }
      equipos = preparado.equipos;
    }

    const validacionEquipos = await validarEquiposParaReserva({
      equipos,
      fechaClave,
      timeIn: horas.timeIn,
      timeOut: horas.timeOut,
      excluirOrigen: { tipo: "Requirement", id },
    });
    if (validacionEquipos.error) {
      return res
        .status(estadoHttpEquipos(validacionEquipos.error))
        .json({ message: validacionEquipos.error });
    }

    actual.nombre = nombre;
    actual.departamentoId = departamento._id;
    actual.departamentoNombre = departamento.nombre;
    actual.evento = {
      programa:
        body.evento?.programa !== undefined
          ? texto(body.evento.programa)
          : actual.evento?.programa,
      tipoEvento:
        body.evento?.tipoEvento !== undefined
          ? texto(body.evento.tipoEvento)
          : actual.evento?.tipoEvento,
      fecha: fechaClave,
      horaInicio,
      horaFin,
      locacion:
        body.evento?.locacion !== undefined
          ? texto(body.evento.locacion)
          : actual.evento?.locacion,
    };
    actual.personal = personal;
    actual.equipos = equipos;

    if (body.prioridad !== undefined) actual.prioridad = texto(body.prioridad);
    if (body.solicitante !== undefined) {
      actual.solicitante = mapearSolicitante(body.solicitante);
    }
    if (body.descripcion !== undefined) actual.descripcion = texto(body.descripcion);
    if (body.observacion !== undefined) actual.observacion = texto(body.observacion);

    if (eraFinal) {
      actual.estado = "Pendiente";
      actual.decididoPor = "";
      actual.decididoPorId = "";
      actual.decididoEn = null;
      actual.motivoDecision = "";
      (actual.equipos ?? []).forEach((linea) => {
        linea.estadoInventario = "Pendiente";
      });
    }

    actual.revision = Number(actual.revision ?? 0) + 1;
    actual.actualizadoPor = usuario.nombre;
    actual.actualizadoPorId = usuario.id;
    actual.historial = [
      ...(Array.isArray(actual.historial) ? actual.historial : []),
      entradaHistorial({
        tipo: "actualizacion",
        estadoAnterior,
        estadoNuevo: actual.estado,
        nota:
          texto(body.notaCambio) ||
          (eraFinal
            ? "Solicitud reabierta a Pendiente por edición."
            : "Solicitud actualizada."),
        usuario,
      }),
    ];

    const guardada = await actual.save();

    if (eraFinal) {
      await liberarEquiposDeOrigen({
        origenTipo: "Requirement",
        origenId: id,
        usuario,
        motivo: "La solicitud fue reabierta por edición",
      });
    }

    broadcast("requirements:changed", {
      action: "updated",
      id: String(guardada._id),
    });

    res.json(guardada);
  } catch (error) {
    res.status(500).json({
      message: error?.message || "No se pudo actualizar la solicitud",
    });
  }
};

export const decideRequirement = async (req, res) => {
  const { id } = req.params;
  const { estadoNuevo, motivo, revision } = req.body ?? {};
  const usuario = usuarioSesion(req);

  try {
    const actual = await Requirement.findById(id);
    if (!actual) {
      return res.status(404).json({ message: "La solicitud no existe" });
    }

    if (await tieneCustodiaActivaDeOrigen("Requirement", id)) {
      return res.status(409).json({
        message:
          "La solicitud tiene equipos cargados a un trabajador. Descarga las Assignments antes de tomar una decisión.",
      });
    }

    if (!transicionDecisionValida(actual.estado, estadoNuevo)) {
      return res.status(409).json({
        message: `No se puede pasar de "${actual.estado}" a "${estadoNuevo}"`,
      });
    }

    if (
      revision === undefined ||
      Number(revision) !== Number(actual.revision ?? 0)
    ) {
      return res.status(409).json({
        message:
          "La solicitud fue modificada por otro usuario. Recarga e intenta de nuevo.",
        revision: actual.revision ?? 0,
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
      const equiposParaReservar = (actual.equipos ?? []).map((linea) => ({
        ...(typeof linea.toObject === "function" ? linea.toObject() : linea),
        aceptaRestricciones: Boolean(req.body?.aceptaRestricciones),
      }));

      const validacion = await reservarEquiposParaOrigen({
        equipos: equiposParaReservar,
        fechaClave: actual.evento?.fecha,
        timeIn:
          req.body?.timeIn ||
          construirFechaHora(actual.evento?.fecha, actual.evento?.horaInicio),
        timeOut:
          req.body?.timeOut ||
          construirFechaHora(actual.evento?.fecha, actual.evento?.horaFin),
        origenTipo: "Requirement",
        origenId: actual._id,
        origenCodigo: actual.codigo,
        origenNombre: actual.nombre,
        usuario,
      });

      if (validacion.error) {
        return res
          .status(estadoHttpEquipos(validacion.error))
          .json({ message: validacion.error });
      }

      if (req.body?.aceptaRestricciones) {
        (actual.equipos ?? []).forEach((linea) => {
          if ((linea.restricciones ?? []).length === 0) return;
          linea.restriccionesAceptadasPor = usuario.nombre;
          linea.restriccionesAceptadasPorId = usuario.id;
          linea.restriccionesAceptadasEl = new Date();
        });
      }

      (actual.equipos ?? []).forEach((linea) => {
        linea.estadoInventario = "Asignado";
      });

      reservas = validacion;
    } else {
      (actual.equipos ?? []).forEach((linea) => {
        linea.estadoInventario = "Pendiente";
      });
    }

    const estadoAnterior = actual.estado;
    const estadoFinal =
      estadoNuevo === "Aprobada" ? estadoAprobado(actual.personal) : estadoNuevo;
    actual.estado = estadoFinal;
    actual.decididoPor = usuario.nombre;
    actual.decididoPorId = usuario.id;
    actual.decididoEn = new Date();
    actual.motivoDecision = motivoFinal;
    actual.actualizadoPor = usuario.nombre;
    actual.actualizadoPorId = usuario.id;
    actual.revision = Number(actual.revision ?? 0) + 1;

    const tipo =
      estadoFinal === "Agendado"
        ? "agendamiento"
        : estadoFinal === "Aprobada"
          ? "aprobacion"
          : estadoFinal === "Rechazada"
            ? "rechazo"
            : "revision";

    actual.historial = [
      ...(Array.isArray(actual.historial) ? actual.historial : []),
      entradaHistorial({
        tipo,
        estadoAnterior,
        estadoNuevo: estadoFinal,
        nota:
          motivoFinal ||
          (estadoFinal === "Agendado"
            ? "Solicitud aprobada, con personal completo y equipos reservados."
            : estadoFinal === "Aprobada"
              ? "Solicitud aprobada y equipos reservados."
              : "Solicitud actualizada."),
        usuario,
      }),
    ];

    let guardada;
    try {
      guardada = await actual.save();
    } catch (error) {
      if (reservas?.asignaciones?.length) {
        await liberarEquiposDeOrigen({
          origenTipo: "Requirement",
          origenId: id,
          usuario,
          motivo: "Error al guardar la aprobación",
        });
      }
      throw error;
    }

    if (estadoNuevo !== "Aprobada") {
      await liberarEquiposDeOrigen({
        origenTipo: "Requirement",
        origenId: id,
        usuario,
        motivo: motivoFinal || `Solicitud ${estadoNuevo.toLowerCase()}`,
      });
    }

    broadcast("requirements:changed", {
      action: "decided",
      id: String(guardada._id),
      estado: estadoFinal,
    });

    res.json(guardada);
  } catch (error) {
    res.status(500).json({
      message: error?.message || "No se pudo procesar la decisión",
    });
  }
};

export const assignRequirementPersonnel = async (req, res) => {
  const { id, rolId } = req.params;
  const { asignados, revision } = req.body ?? {};
  const usuario = usuarioSesion(req);

  try {
    const actual = await Requirement.findById(id);
    if (!actual) {
      return res.status(404).json({ message: "La solicitud no existe" });
    }

    if (!permiteAsignarPersonal(actual.estado)) {
      return res.status(409).json({
        message: "La solicitud rechazada no permite asignaciones",
      });
    }

    const estadoAnterior = actual.estado;

    if (
      revision === undefined ||
      Number(revision) !== Number(actual.revision ?? 0)
    ) {
      return res.status(409).json({
        message:
          "La solicitud fue modificada por otro usuario. Recarga e intenta de nuevo.",
        revision: actual.revision ?? 0,
      });
    }

    const linea = (actual.personal ?? []).find(
      (item) => String(item.rolId) === String(rolId)
    );
    if (!linea) {
      return res.status(404).json({
        message: "El grupo requerido no existe en la solicitud",
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
          .map((item) => String(item?.id ?? item?.userId ?? item?.Id ?? "").trim())
          .filter(Boolean)
      ),
    ];

    if (ids.length > numero(linea.cantidad)) {
      return res.status(400).json({
        message: `Solo puedes asignar ${numero(linea.cantidad)} persona(s)`,
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
      (linea.asignados ?? []).map((asignado) => String(asignado.Id))
    );
    const removidos = [...anterioresIds].filter(
      (idActual) => !ids.includes(idActual)
    );

    if (removidos.length > 0) {
      const custodias = await custodiasActivasDeOrigen("Requirement", id);
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

    linea.asignados = validas.map((persona) => ({
      Id: String(persona._id),
      Nombre: `${persona.nombres ?? ""} ${persona.apellidos ?? ""}`.trim(),
      Cargo: persona.cargo ?? "",
      GrupoId: String(rolId),
      AsignadoEl: new Date(),
      AsignadoPor: usuario.nombre,
      AsignadoPorId: usuario.id,
    }));

    const estadoNuevo = estadoTrasAsignacion(estadoAnterior, actual.personal);
    actual.estado = estadoNuevo;
    actual.revision = Number(actual.revision ?? 0) + 1;
    actual.actualizadoPor = usuario.nombre;
    actual.actualizadoPorId = usuario.id;
    actual.historial = [
      ...(Array.isArray(actual.historial) ? actual.historial : []),
      entradaHistorial({
        tipo:
          estadoAnterior !== estadoNuevo && estadoNuevo === "Agendado"
            ? "agendamiento"
            : "asignacion",
        estadoAnterior,
        estadoNuevo,
        nota:
          validas.length > 0
            ? `Personal asignado a ${linea.rol || linea.rolId}: ${linea.asignados
                .map((persona) => persona.Nombre)
                .join(", ")}.${
                estadoAnterior !== estadoNuevo
                  ? ` Estado: ${estadoAnterior} → ${estadoNuevo}.`
                  : ""
              }`
            : `Se liberó el personal de ${linea.rol || linea.rolId}.${
                estadoAnterior !== estadoNuevo
                  ? ` Estado: ${estadoAnterior} → ${estadoNuevo}.`
                  : ""
              }`,
        usuario,
      }),
    ];

    const guardada = await actual.save();

    broadcast("requirements:changed", {
      action: "assigned",
      id: String(guardada._id),
      estado: estadoNuevo,
    });

    res.json(guardada);
  } catch (error) {
    res.status(500).json({
      message: error?.message || "No se pudo asignar el personal",
    });
  }
};

export const deleteRequirement = async (req, res) => {
  const { id } = req.params;
  const usuario = usuarioSesion(req);

  try {
    const actual = await Requirement.findById(id);
    if (!actual) {
      return res.status(404).json({ message: "La solicitud no existe" });
    }

    if (await tieneCustodiaActivaDeOrigen("Requirement", actual._id)) {
      return res.status(409).json({
        message:
          "La solicitud tiene equipos cargados a un trabajador. Descarga las Assignments antes de eliminarla.",
      });
    }

    await liberarEquiposDeOrigen({
      origenTipo: "Requirement",
      origenId: id,
      usuario,
      motivo: "La solicitud fue eliminada",
    });

    await Requirement.findByIdAndDelete(id);

    broadcast("requirements:changed", {
      action: "deleted",
      id,
    });

    res.json({ message: "Solicitud eliminada correctamente" });
  } catch (error) {
    res.status(500).json({
      message: error?.message || "No se pudo eliminar la solicitud",
    });
  }
};

export const listRequirementEquipment = async (req, res) => {
  try {
    const actual = await Requirement.findById(req.params.id).select(
      "equipos codigo nombre"
    );
    if (!actual) {
      return res.status(404).json({ message: "La solicitud no existe" });
    }

    res.json({
      codigo: actual.codigo,
      nombre: actual.nombre,
      equipos: actual.equipos ?? [],
    });
  } catch (error) {
    res.status(500).json({
      message: error?.message || "No se pudieron consultar los equipos",
    });
  }
};
