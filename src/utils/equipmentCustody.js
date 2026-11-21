/*
  Servicio de Assignments (custodia de equipos).

  Reglas centrales:
  - Una custodia pertenece a un trabajador y a un Programmer/Requirement.
  - El equipo se bloquea en Equipment.custodiaActivaId desde la creación.
  - El bloqueo es independiente de la franja horaria y solo se libera con la
    descarga (sin novedad) o con la anulación de una custodia pendiente.
  - La descarga es completa y la firma el almacenista de la sesión.
*/

import mongoose from "mongoose";

import Counter from "../models/Counter";
import Equipment from "../models/Equipment";
import EquipmentAssignment from "../models/EquipmentAssignment";
import EquipmentCustody from "../models/EquipmentCustody";
import EquipmentIncident from "../models/EquipmentIncident";
import Groups from "../models/Groups";
import Novelty from "../models/Novelty";
import Payroll from "../models/Payroll";
import Programmers from "../models/Programmer";
import Requirement from "../models/Requirement";
import { broadcast, RT_EVENTS } from "../realtime";
import { agregarEvento } from "./equipmentHistory";
import {
  crearRegistroMantenimiento,
  crearSeguimientoDescarga,
} from "./equipmentMaintenanceFlow";
import { metadataImagenEquipo } from "./equipmentImages";
import {
  descripcionEquipo,
  esObjectIdValido,
  textosRestricciones,
} from "./equipmentRules";
import {
  CODIGO_APROBACION_TEMPORAL,
  ES_VERIFICACION_TEMPORAL,
  MAX_EQUIPOS_POR_CUSTODIA,
  MAX_INTENTOS_CODIGO,
  codigoTemporalValido,
  esOrigenElegible,
  resumenNovedades,
  validarDescarga,
} from "./assignmentRules";
import { serializarCustodia } from "./assignmentSerializer";

const texto = (valor) => String(valor ?? "").trim();
const idDe = (valor) =>
  valor && typeof valor === "object"
    ? String(valor._id ?? valor.id ?? "")
    : String(valor ?? "");

const lista = (valor) => (Array.isArray(valor) ? valor : []);

export class CustodiaError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.name = "CustodiaError";
    this.status = status;
    this.extra = extra;
  }
}

const error = (status, message, extra) => {
  throw new CustodiaError(status, message, extra);
};

const normalizarOrigenTipo = (valor) => {
  const tipo = texto(valor);
  if (!["Programmer", "Requirement"].includes(tipo)) {
    error(400, "El origen debe ser Programmer o Requirement");
  }
  return tipo;
};

export const obtenerConfigVerificacion = () => ({
  codigo: CODIGO_APROBACION_TEMPORAL,
  temporal: ES_VERIFICACION_TEMPORAL,
  metodo: "temporal",
  intentosMaximos: MAX_INTENTOS_CODIGO,
  aviso:
    "Código temporal de pruebas. Se reemplazará por la aceptación desde la app móvil.",
});

const generarCodigoCustodia = async (fecha = new Date()) => {
  const anio = Number(fecha.getFullYear()) || new Date().getFullYear();

  for (let intento = 0; intento < 10; intento += 1) {
    const contador = await Counter.findByIdAndUpdate(
      `assignment-${anio}`,
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    const codigo = `ASG-${anio}-${String(contador.seq).padStart(4, "0")}`;
    const existe = await EquipmentCustody.exists({ codigo });
    if (!existe) return codigo;
  }

  throw new Error("No se pudo generar el código de la Assignment");
};

const cargarOrigen = async (origenTipo, origenId) => {
  const tipo = normalizarOrigenTipo(origenTipo);
  if (!esObjectIdValido(origenId)) {
    error(400, "El identificador del origen no es válido");
  }

  if (tipo === "Programmer") {
    const doc = await Programmers.findById(origenId).lean();
    if (!doc) error(404, "El requerimiento no existe");

    const personal = [];
    lista(doc.Personal).forEach((linea) => {
      const grupoId = texto(linea?.RolId);
      lista(linea?.Asignados).forEach((asignado) => {
        personal.push({
          id: texto(asignado?.Id),
          nombre: texto(asignado?.Nombre),
          cargo: texto(asignado?.Cargo),
          grupoId: texto(asignado?.GrupoId) || grupoId,
        });
      });
    });

    const equipos = lista(doc.Equipos)
      .map((linea) => ({
        inventarioId: texto(linea?.InventarioId ?? linea?.EquipoId),
        placa: texto(linea?.Placa),
        descripcion: texto(linea?.Descripcion ?? linea?.Equipo),
        categoria: texto(linea?.Categoria),
        subcategoria: texto(linea?.Subcategoria),
      }))
      .filter((linea) => linea.inventarioId);

    return {
      tipo,
      id: String(doc._id),
      codigo: texto(doc.Codigo),
      nombre: texto(doc.Nombre),
      estado: texto(doc.Estado),
      fecha: doc.Fecha_clave ?? null,
      horaInicio: doc.Time_in ?? null,
      horaFin: doc.Time_out ?? null,
      personal,
      equipos,
      raw: doc,
    };
  }

  const doc = await Requirement.findById(origenId).lean();
  if (!doc) error(404, "La solicitud no existe");

  const personal = [];
  lista(doc.personal).forEach((linea) => {
    const grupoId = texto(linea?.rolId);
    lista(linea?.asignados).forEach((asignado) => {
      personal.push({
        id: texto(asignado?.Id),
        nombre: texto(asignado?.Nombre),
        cargo: texto(asignado?.Cargo),
        grupoId: texto(asignado?.GrupoId) || grupoId,
      });
    });
  });

  const equipos = lista(doc.equipos)
    .map((linea) => ({
      inventarioId: texto(linea?.inventarioId),
      placa: texto(linea?.placa),
      descripcion: texto(linea?.descripcion),
      categoria: texto(linea?.categoria),
      subcategoria: texto(linea?.subcategoria),
    }))
    .filter((linea) => linea.inventarioId);

  return {
    tipo,
    id: String(doc._id),
    codigo: texto(doc.codigo),
    nombre: texto(doc.nombre),
    estado: texto(doc.estado),
    fecha: doc.evento?.fecha ?? null,
    horaInicio: null,
    horaFin: null,
    personal,
    equipos,
    raw: doc,
  };
};

const deduplicarPersonal = (personal = []) => {
  const mapa = new Map();
  lista(personal).forEach((persona) => {
    if (!persona?.id || mapa.has(persona.id)) return;
    mapa.set(persona.id, persona);
  });
  return [...mapa.values()];
};

const deduplicarEquipos = (equipos = []) => {
  const mapa = new Map();
  lista(equipos).forEach((equipo) => {
    if (!equipo?.inventarioId || mapa.has(equipo.inventarioId)) return;
    mapa.set(equipo.inventarioId, equipo);
  });
  return [...mapa.values()];
};

const imagenesDeEquipos = async (equipoIds = []) => {
  const ids = [
    ...new Set(lista(equipoIds).map((id) => texto(id)).filter(esObjectIdValido)),
  ];
  if (ids.length === 0) return new Map();

  const equipos = await Equipment.find({ _id: { $in: ids } })
    .select("_id categoriaId subcategoriaId")
    .populate("categoriaId", "nombre imagen imagenMiniatura")
    .populate("subcategoriaId", "nombre imagen imagenMiniatura")
    .lean();

  return new Map(
    equipos.map((equipo) => [
      String(equipo._id),
      metadataImagenEquipo(equipo),
    ])
  );
};

const hidratarOrigen = async (origen) => {
  const personal = deduplicarPersonal(origen.personal);
  const equipos = deduplicarEquipos(origen.equipos);
  const trabajadorIds = personal.map((persona) => persona.id);
  const equipoIds = equipos.map((equipo) => equipo.inventarioId);

  const [payroll, grupos, inventario, reservas, custodias] = await Promise.all([
    trabajadorIds.length
      ? Payroll.find({ _id: { $in: trabajadorIds } }).lean()
      : [],
    Groups.find().select("_id nombre").lean(),
    equipoIds.length
      ? Equipment.find({ _id: { $in: equipoIds } })
          .select(
            "_id placa descripcion restricciones estado motivoInactivo custodiaActivaId categoriaId subcategoriaId"
          )
          .populate("categoriaId", "nombre descripcion imagen imagenMiniatura")
          .populate("subcategoriaId", "nombre descripcion imagen imagenMiniatura")
          .lean()
      : [],
    equipoIds.length
      ? EquipmentAssignment.find({
          origenTipo: origen.tipo,
          origenId: origen.id,
          estado: "Activa",
          equipoId: { $in: equipoIds },
        }).lean()
      : [],
    equipoIds.length
      ? EquipmentCustody.find({
          activa: true,
          "equipos.equipoId": { $in: equipoIds },
        }).lean()
      : [],
  ]);

  const payrollPorId = new Map(
    payroll.map((persona) => [String(persona._id), persona])
  );
  const grupoPorId = new Map(
    grupos.map((grupo) => [String(grupo._id), grupo.nombre])
  );
  const equipoPorId = new Map(
    inventario.map((equipo) => [String(equipo._id), equipo])
  );
  const reservaPorEquipo = new Map();
  reservas.forEach((reserva) => {
    const clave = String(reserva.equipoId);
    if (!reservaPorEquipo.has(clave)) reservaPorEquipo.set(clave, reserva);
  });

  const custodiaPorEquipo = new Map();
  const custodiaPorTrabajador = new Map();
  custodias.forEach((custodia) => {
    if (custodia.trabajadorId) {
      custodiaPorTrabajador.set(String(custodia.trabajadorId), custodia);
    }
    lista(custodia.equipos).forEach((item) => {
      custodiaPorEquipo.set(String(item.equipoId), {
        custodia,
        item,
      });
    });
  });

  const trabajadores = personal.map((persona) => {
    const nomina = payrollPorId.get(persona.id);
    const grupoId = texto(nomina?.grupoID) || persona.grupoId;
    const custodia = custodiaPorTrabajador.get(persona.id);

    return {
      id: persona.id,
      nombre:
        `${texto(nomina?.nombres)} ${texto(nomina?.apellidos)}`.trim() ||
        persona.nombre,
      cargo: texto(nomina?.cargo) || persona.cargo,
      grupoId,
      grupoNombre: texto(grupoPorId.get(grupoId)) || "",
      celular:
        texto(nomina?.celularPrioritario) || texto(nomina?.celularAux) || "",
      yaAsignado: Boolean(custodia),
      custodiaId: custodia ? String(custodia._id) : null,
      custodiaEstado: custodia ? texto(custodia.estado) : "",
    };
  });

  const equiposDetalle = equipos.map((linea) => {
    const equipo = equipoPorId.get(linea.inventarioId);
    const reserva = reservaPorEquipo.get(linea.inventarioId);
    const custodiaInfo = custodiaPorEquipo.get(linea.inventarioId);

    let asignable = true;
    let motivoNoAsignable = "";

    if (!equipo) {
      asignable = false;
      motivoNoAsignable = "El equipo no existe en el inventario";
    } else if (equipo.estado !== "Activo") {
      asignable = false;
      motivoNoAsignable = `El equipo está en estado ${
        equipo.motivoInactivo || "Inactivo"
      }`;
    } else if (equipo.custodiaActivaId) {
      asignable = false;
      motivoNoAsignable = "El equipo ya tiene una Assignment activa";
    } else if (!reserva) {
      asignable = false;
      motivoNoAsignable = "El equipo no tiene reserva activa de este origin";
    }

    return {
      equipoId: linea.inventarioId,
      placa: texto(equipo?.placa) || linea.placa,
      descripcion: descripcionEquipo(equipo) || linea.descripcion,
      // Se muestran al asignar: el almacenista ve las mismas condiciones que
      // aceptó quien solicitó el equipo.
      restricciones: textosRestricciones(equipo),
      categoria: linea.categoria,
      subcategoria: linea.subcategoria,
      imagen: metadataImagenEquipo(equipo),
      reservaId: reserva ? String(reserva._id) : null,
      estadoInventario: equipo
        ? equipo.estado === "Inactivo"
          ? equipo.motivoInactivo || "Inactivo"
          : "Activo"
        : "No existe",
      enCustodia: Boolean(custodiaInfo),
      custodiaId: custodiaInfo ? String(custodiaInfo.custodia._id) : null,
      trabajadorNombre: custodiaInfo
        ? texto(custodiaInfo.custodia.trabajadorNombre)
        : "",
      asignable,
      motivoNoAsignable,
    };
  });

  return {
    origen: {
      tipo: origen.tipo,
      id: origen.id,
      codigo: origen.codigo,
      nombre: origen.nombre,
      estado: origen.estado,
      fecha: origen.fecha,
      horaInicio: origen.horaInicio,
      horaFin: origen.horaFin,
    },
    trabajadores,
    equipos: equiposDetalle,
    resumen: {
      trabajadores: trabajadores.length,
      trabajadoresConCustodia: trabajadores.filter((item) => item.yaAsignado)
        .length,
      equipos: equiposDetalle.length,
      equiposAsignables: equiposDetalle.filter((item) => item.asignable).length,
      equiposEnCustodia: equiposDetalle.filter((item) => item.enCustodia).length,
    },
  };
};

export const obtenerOrigenElegible = async (origenTipo, origenId) => {
  const origen = await cargarOrigen(origenTipo, origenId);
  if (!esOrigenElegible(origen.estado)) {
    error(409, "Solo se pueden asignar origenes Aprobados o Agendados");
  }
  return hidratarOrigen(origen);
};

const fechaDesdeTexto = (valor) => {
  const textoValor = texto(valor);
  if (!textoValor) return null;

  // Un input date envía "YYYY-MM-DD". Se construye en hora local para que el
  // rango no se corra un día en zonas horarias negativas como America/Bogota.
  const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(textoValor);
  if (soloFecha) {
    const [, anio, mes, dia] = soloFecha;
    return new Date(Number(anio), Number(mes) - 1, Number(dia));
  }

  const fecha = new Date(textoValor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
};

const rangoFechas = (desde, hasta) => {
  const filtro = {};
  const inicio = fechaDesdeTexto(desde);
  const fin = fechaDesdeTexto(hasta);

  if (inicio) {
    inicio.setHours(0, 0, 0, 0);
    filtro.$gte = inicio;
  }
  if (fin) {
    fin.setHours(23, 59, 59, 999);
    filtro.$lte = fin;
  }

  return Object.keys(filtro).length > 0 ? filtro : null;
};

const escaparRegex = (valor) =>
  String(valor ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const resumenCounts = async (origenes) => {
  if (origenes.length === 0) return new Map();

  const progIds = origenes
    .filter((item) => item.tipo === "Programmer")
    .map((item) => item.id);
  const reqIds = origenes
    .filter((item) => item.tipo === "Requirement")
    .map((item) => item.id);

  const agrupar = async (Model, origenTipo, ids) => {
    if (ids.length === 0) return [];
    return Model.aggregate([
      {
        $match: {
          origenTipo,
          activa: true,
          origenId: {
            $in: ids.map((id) => new mongoose.Types.ObjectId(id)),
          },
        },
      },
      {
        $group: {
          _id: "$origenId",
          equipos: { $addToSet: "$equipos.equipoId" },
        },
      },
      {
        $project: {
          equipos: {
            $reduce: {
              input: "$equipos",
              initialValue: [],
              in: { $setUnion: ["$$value", "$$this"] },
            },
          },
        },
      },
    ]);
  };

  const [reservasProg, reservasReq, custodiasProg, custodiasReq] =
    await Promise.all([
      EquipmentAssignment.aggregate([
        {
          $match: {
            origenTipo: "Programmer",
            estado: "Activa",
            origenId: { $in: progIds.map((id) => new mongoose.Types.ObjectId(id)) },
          },
        },
        {
          $group: {
            _id: "$origenId",
            equipos: { $addToSet: "$equipoId" },
          },
        },
      ]),
      EquipmentAssignment.aggregate([
        {
          $match: {
            origenTipo: "Requirement",
            estado: "Activa",
            origenId: { $in: reqIds.map((id) => new mongoose.Types.ObjectId(id)) },
          },
        },
        {
          $group: {
            _id: "$origenId",
            equipos: { $addToSet: "$equipoId" },
          },
        },
      ]),
      agrupar(EquipmentCustody, "Programmer", progIds),
      agrupar(EquipmentCustody, "Requirement", reqIds),
    ]);

  const mapa = new Map();

  const registrar = (items, tipo, campo, valor) => {
    items.forEach((item) => {
      const clave = `${tipo}:${String(item._id)}`;
      const actual = mapa.get(clave) ?? {};
      actual[campo] = valor(item);
      mapa.set(clave, actual);
    });
  };

  registrar(reservasProg, "Programmer", "equiposReservados", (item) =>
    item.equipos.length
  );
  registrar(reservasReq, "Requirement", "equiposReservados", (item) =>
    item.equipos.length
  );
  registrar(custodiasProg, "Programmer", "equiposEnCustodia", (item) =>
    item.equipos.length
  );
  registrar(custodiasReq, "Requirement", "equiposEnCustodia", (item) =>
    item.equipos.length
  );

  return mapa;
};

export const listarOrigenesElegibles = async ({
  desde,
  hasta,
  origenTipo,
  q,
} = {}) => {
  const tipo = texto(origenTipo);
  const rango = rangoFechas(desde, hasta);
  const patron = texto(q) ? new RegExp(escaparRegex(texto(q)), "i") : null;

  const filtroProgrammer = {
    Estado: { $in: ["Aprobada", "Agendado"] },
  };
  const filtroRequirement = {
    estado: { $in: ["Aprobada", "Agendado"] },
  };

  if (rango) {
    filtroProgrammer.Fecha_clave = rango;
    filtroRequirement["evento.fecha"] = rango;
  }

  if (patron) {
    filtroProgrammer.$or = [
      { Nombre: patron },
      { Codigo: patron },
      { Programa: patron },
      { Descripcion: patron },
    ];
    filtroRequirement.$or = [
      { nombre: patron },
      { codigo: patron },
      { "evento.programa": patron },
      { descripcion: patron },
    ];
  }

  const consultas = [];
  if (!tipo || tipo === "Programmer") {
    consultas.push(
      Programmers.find(filtroProgrammer)
        .sort({ Fecha_clave: 1 })
        .limit(100)
        .lean()
        .then((docs) =>
          docs.map((doc) => ({
            tipo: "Programmer",
            id: String(doc._id),
            codigo: texto(doc.Codigo),
            nombre: texto(doc.Nombre),
            estado: texto(doc.Estado),
            fecha: doc.Fecha_clave ?? null,
            horaInicio: doc.Time_in ?? null,
            horaFin: doc.Time_out ?? null,
            personal: lista(doc.Personal).reduce(
              (total, linea) => total + lista(linea?.Asignados).length,
              0
            ),
            equipos: lista(doc.Equipos).filter((linea) =>
              texto(linea?.InventarioId ?? linea?.EquipoId)
            ).length,
          }))
        )
    );
  }

  if (!tipo || tipo === "Requirement") {
    consultas.push(
      Requirement.find(filtroRequirement)
        .sort({ "evento.fecha": 1 })
        .limit(100)
        .lean()
        .then((docs) =>
          docs.map((doc) => ({
            tipo: "Requirement",
            id: String(doc._id),
            codigo: texto(doc.codigo),
            nombre: texto(doc.nombre),
            estado: texto(doc.estado),
            fecha: doc.evento?.fecha ?? null,
            horaInicio: null,
            horaFin: null,
            personal: lista(doc.personal).reduce(
              (total, linea) => total + lista(linea?.asignados).length,
              0
            ),
            equipos: lista(doc.equipos).filter((linea) =>
              texto(linea?.inventarioId)
            ).length,
          }))
        )
    );
  }

  const listas = await Promise.all(consultas);
  const origenes = listas.flat().sort((a, b) => {
    const fechaA = a.fecha ? new Date(a.fecha).getTime() : 0;
    const fechaB = b.fecha ? new Date(b.fecha).getTime() : 0;
    return fechaA - fechaB;
  });

  const conteos = await resumenCounts(origenes);

  return origenes.map((origen) => {
    const clave = `${origen.tipo}:${origen.id}`;
    const extra = conteos.get(clave) ?? {};
    const equiposReservados = Number(extra.equiposReservados) || 0;
    const equiposEnCustodia = Number(extra.equiposEnCustodia) || 0;

    return {
      ...origen,
      equiposReservados,
      equiposEnCustodia,
      equiposPendientes: Math.max(0, equiposReservados - equiposEnCustodia),
      listo:
        origen.personal > 0 &&
        equiposReservados > 0 &&
        equiposReservados > equiposEnCustodia,
    };
  });
};

const obtenerTrabajadorDeNomina = async ({ trabajadorId, grupoId }) => {
  if (!esObjectIdValido(trabajadorId)) {
    error(400, "El identificador del trabajador no es válido");
  }

  const nomina = await Payroll.findById(trabajadorId).lean();
  if (!nomina || nomina.activo === false) {
    error(409, "El trabajador no existe o está inactivo en la nómina");
  }

  const grupo = texto(nomina.grupoID) || texto(grupoId);
  if (!esObjectIdValido(grupo)) {
    error(
      409,
      "El trabajador no tiene un grupo válido en la nómina; no se puede crear la Assignment"
    );
  }

  const existeGrupo = await Groups.exists({ _id: grupo });
  if (!existeGrupo) {
    error(409, "El grupo del trabajador no existe; no se puede crear la Assignment");
  }

  return { nomina, grupoId: grupo };
};

const obtenerReservas = async ({ origenTipo, origenId, equipoIds }) => {
  const reservas = await EquipmentAssignment.find({
    origenTipo,
    origenId,
    estado: "Activa",
    equipoId: { $in: equipoIds },
  }).lean();

  const mapa = new Map();
  reservas.forEach((reserva) => {
    const clave = String(reserva.equipoId);
    if (!mapa.has(clave)) mapa.set(clave, reserva);
  });
  return mapa;
};

const bloquearEquipo = async ({ equipo, custodia, usuario }) => {
  const actualizado = await Equipment.findOneAndUpdate(
    {
      _id: equipo._id,
      estado: "Activo",
      custodiaActivaId: null,
    },
    {
      $set: {
        custodiaActivaId: custodia._id,
        actualizadoPor: texto(usuario.nombre),
        actualizadoPorId: texto(usuario.id),
      },
      $push: {
        hojaDeVida: {
          tipo: "custodia_creada",
          titulo: "Equipo asignado a un trabajador",
          detalle: `${custodia.codigo} · ${custodia.trabajadorNombre} · ${custodia.origenCodigo}`,
          estadoAnterior: "Disponible",
          estadoNuevo: "Asignado",
          por: texto(usuario.nombre),
          porId: texto(usuario.id),
          el: new Date(),
          meta: {
            custodiaId: String(custodia._id),
            codigo: custodia.codigo,
            trabajadorId: custodia.trabajadorId,
            trabajadorNombre: custodia.trabajadorNombre,
            origenTipo: custodia.origenTipo,
            origenId: String(custodia.origenId),
            origenCodigo: custodia.origenCodigo,
          },
        },
      },
    },
    { new: true }
  );

  if (!actualizado) {
    error(
      409,
      `El equipo ${equipo.placa} ya no está disponible para asignar`
    );
  }

  return actualizado;
};

const liberarReserva = async ({ reservaId, usuario, motivo }) => {
  if (!reservaId) return null;

  return EquipmentAssignment.findOneAndUpdate(
    { _id: reservaId, estado: "Activa" },
    {
      $set: {
        estado: "Liberada",
        liberadoPor: texto(usuario.nombre),
        liberadoPorId: texto(usuario.id),
        liberadoEn: new Date(),
        motivoLiberacion: texto(motivo),
      },
    },
    { new: true }
  );
};

export const crearCustodia = async ({
  origenTipo,
  origenId,
  trabajadorId,
  equipos = [],
  observaciones = "",
  usuario = {},
}) => {
  const origen = await cargarOrigen(origenTipo, origenId);

  if (!esOrigenElegible(origen.estado)) {
    error(409, "Solo se pueden asignar origenes Aprobados o Agendados");
  }

  const personal = deduplicarPersonal(origen.personal);
  const trabajadorOrigen = personal.find(
    (persona) => String(persona.id) === String(trabajadorId)
  );
  if (!trabajadorOrigen) {
    error(
      409,
      "El trabajador seleccionado no está asignado a este requerimiento"
    );
  }

  const { nomina, grupoId } = await obtenerTrabajadorDeNomina({
    trabajadorId,
    grupoId: trabajadorOrigen.grupoId,
  });

  const idsEquipos = [
    ...new Set(lista(equipos).map((id) => texto(id)).filter(Boolean)),
  ];
  if (idsEquipos.length === 0) {
    error(400, "Selecciona al menos un equipo para la Assignment");
  }
  if (idsEquipos.length > MAX_EQUIPOS_POR_CUSTODIA) {
    error(
      400,
      `Máximo ${MAX_EQUIPOS_POR_CUSTODIA} equipos por Assignment`
    );
  }

  const equiposOrigen = deduplicarEquipos(origen.equipos);
  const lineas = idsEquipos.map((id) => {
    const linea = equiposOrigen.find((item) => item.inventarioId === id);
    if (!linea) {
      error(409, "Uno de los equipos no pertenece al requerimiento");
    }
    return linea;
  });

  const existente = await EquipmentCustody.findOne({
    origenTipo: origen.tipo,
    origenId: origen.id,
    trabajadorId: String(trabajadorId),
    activa: true,
  }).lean();
  if (existente) {
    error(
      409,
      "El trabajador ya tiene una Assignment activa para este requerimiento"
    );
  }

  const inventario = await Equipment.find({ _id: { $in: idsEquipos } }).lean();
  const inventarioPorId = new Map(
    inventario.map((equipo) => [String(equipo._id), equipo])
  );
  const reservas = await obtenerReservas({
    origenTipo: origen.tipo,
    origenId: origen.id,
    equipoIds: idsEquipos,
  });

  for (const id of idsEquipos) {
    const equipo = inventarioPorId.get(id);
    if (!equipo) error(409, "Uno de los equipos no existe en el inventario");
    if (equipo.estado !== "Activo") {
      error(
        409,
        `El equipo ${equipo.placa} está en estado ${
          equipo.motivoInactivo || "Inactivo"
        }`
      );
    }
    if (equipo.custodiaActivaId) {
      error(409, `El equipo ${equipo.placa} ya tiene una Assignment activa`);
    }
    if (!reservas.has(id)) {
      error(
        409,
        `El equipo ${equipo.placa} no tiene una reserva activa de este requerimiento`
      );
    }
  }

  const codigo = await generarCodigoCustodia();
  const grupoNombre = await Groups.findById(grupoId)
    .select("nombre")
    .lean()
    .then((grupo) => texto(grupo?.nombre));

  const custodia = await EquipmentCustody.create({
    codigo,
    origenTipo: origen.tipo,
    origenId: origen.id,
    origenCodigo: origen.codigo,
    origenNombre: origen.nombre,
    origenFecha: origen.fecha,
    origenEstado: origen.estado,
    trabajadorId: String(trabajadorId),
    trabajadorNombre:
      `${texto(nomina.nombres)} ${texto(nomina.apellidos)}`.trim() ||
      trabajadorOrigen.nombre,
    trabajadorCargo: texto(nomina.cargo) || trabajadorOrigen.cargo,
    trabajadorGrupoId: grupoId,
    trabajadorGrupoNombre: grupoNombre,
    estado: "Pendiente",
    activa: true,
    observaciones: texto(observaciones),
    equipos: lineas.map((linea) => ({
      equipoId: linea.inventarioId,
      placaSnapshot: linea.placa,
      descripcionSnapshot: linea.descripcion,
      categoriaSnapshot: linea.categoria,
      subcategoriaSnapshot: linea.subcategoria,
      reservaId: String(reservas.get(linea.inventarioId)._id),
      estado: "Pendiente",
    })),
    creadaPor: texto(usuario.nombre),
    creadaPorId: texto(usuario.id),
    creadaEn: new Date(),
    historial: [
      {
        tipo: "creacion",
        detalle: `Assignment ${codigo} creada para ${origen.codigo || origen.nombre}`,
        por: texto(usuario.nombre),
        porId: texto(usuario.id),
        el: new Date(),
        meta: {
          trabajadorId: String(trabajadorId),
          equipos: idsEquipos,
        },
      },
    ],
  });

  try {
    for (const id of idsEquipos) {
      await bloquearEquipo({
        equipo: inventarioPorId.get(id),
        custodia,
        usuario,
      });
    }
  } catch (err) {
    await Equipment.updateMany(
      { custodiaActivaId: custodia._id },
      {
        $set: { custodiaActivaId: null },
        $pull: { hojaDeVida: { "meta.custodiaId": String(custodia._id) } },
      }
    ).catch(() => {});
    await EquipmentCustody.deleteOne({ _id: custodia._id }).catch(() => {});
    throw err;
  }

  broadcast(RT_EVENTS.EQUIPMENT_CHANGED, {
    action: "custody-created",
    id: String(custodia._id),
  });
  broadcast(RT_EVENTS.ASSIGNMENT_CHANGED, {
    action: "created",
    id: String(custodia._id),
    estado: custodia.estado,
    trabajadorId: custodia.trabajadorId,
    origenTipo: custodia.origenTipo,
    origenId: String(custodia.origenId),
  });

  return custodia;
};

const buscarCustodia = async (id, { incluirHistorial = false } = {}) => {
  if (!esObjectIdValido(id)) error(400, "La Assignment no es válida");
  const custodia = await EquipmentCustody.findById(id);
  if (!custodia) error(404, "La Assignment no existe");
  return { custodia, incluirHistorial };
};

export const obtenerCustodia = async (id) => {
  const { custodia } = await buscarCustodia(id);
  const imagenesPorEquipo = await imagenesDeEquipos(
    lista(custodia.equipos).map((item) => item.equipoId)
  );

  return serializarCustodia(custodia.toObject(), {
    incluirHistorial: true,
    imagenesPorEquipo,
  });
};

const registrarHistorial = (custodia, entrada) => {
  custodia.historial.push({
    tipo: entrada.tipo,
    detalle: texto(entrada.detalle),
    por: texto(entrada.por),
    porId: texto(entrada.porId),
    el: new Date(),
    meta: entrada.meta ?? {},
  });
};

export const aceptarCustodia = async ({
  id,
  codigo,
  revisadoFisicamente,
  usuario = {},
}) => {
  const { custodia } = await buscarCustodia(id);

  if (custodia.estado !== "Pendiente") {
    error(409, "La Assignment ya no está pendiente de aceptación");
  }
  if (custodia.aceptacion?.bloqueada) {
    error(
      429,
      "La verificación está bloqueada. Reinicia los intentos para continuar.",
      { intentosRestantes: 0 }
    );
  }
  if (revisadoFisicamente !== true) {
    error(400, "Debes confirmar la revisión física de los equipos");
  }

  if (!codigoTemporalValido(codigo)) {
    const intentos = Number(custodia.aceptacion?.intentos ?? 0) + 1;
    const bloqueada = intentos >= MAX_INTENTOS_CODIGO;

    await EquipmentCustody.updateOne(
      { _id: custodia._id },
      {
        $set: {
          "aceptacion.intentos": intentos,
          "aceptacion.bloqueada": bloqueada,
        },
        $push: {
          historial: {
            tipo: bloqueada ? "verificacion_bloqueada" : "intento_fallido",
            detalle: `Código de aprobación incorrecto (${intentos}/${MAX_INTENTOS_CODIGO})`,
            por: texto(usuario.nombre),
            porId: texto(usuario.id),
            el: new Date(),
            meta: {},
          },
        },
      }
    );

    error(
      bloqueada ? 429 : 400,
      bloqueada
        ? "Demasiados intentos. Reinicia la verificación para continuar."
        : "El código de aprobación no es correcto",
      { intentosRestantes: Math.max(0, MAX_INTENTOS_CODIGO - intentos) }
    );
  }

  const equipos = (custodia.equipos ?? []).map((item) => ({
    ...item.toObject(),
    estado: "Entregado",
  }));

  const actualizada = await EquipmentCustody.findOneAndUpdate(
    { _id: custodia._id, estado: "Pendiente" },
    {
      $set: {
        estado: "Activa",
        equipos,
        "aceptacion.estado": "Aceptada",
        "aceptacion.metodo": "temporal",
        "aceptacion.revisadoFisicamente": true,
        "aceptacion.aceptadaEn": new Date(),
        "aceptacion.registradaPor": texto(usuario.nombre),
        "aceptacion.registradaPorId": texto(usuario.id),
        "aceptacion.intentos": Number(custodia.aceptacion?.intentos ?? 0),
        "aceptacion.bloqueada": false,
      },
      $push: {
        historial: {
          tipo: "aceptacion",
          detalle: "El trabajador recibió los equipos a conformidad",
          por: texto(usuario.nombre),
          porId: texto(usuario.id),
          el: new Date(),
          meta: { metodo: "temporal" },
        },
      },
    },
    { new: true }
  );

  if (!actualizada) {
    error(409, "La Assignment fue modificada por otro usuario");
  }

  for (const item of actualizada.equipos) {
    await Equipment.updateOne(
      {
        _id: item.equipoId,
        custodiaActivaId: actualizada._id,
      },
      {
        $push: {
          hojaDeVida: {
            tipo: "custodia_aceptada",
            titulo: "Equipo recibido por el trabajador",
            detalle: `${actualizada.codigo} · ${actualizada.trabajadorNombre}`,
            estadoAnterior: "Asignado",
            estadoNuevo: "Asignado",
            por: texto(usuario.nombre),
            porId: texto(usuario.id),
            el: new Date(),
            meta: {
              custodiaId: String(actualizada._id),
              codigo: actualizada.codigo,
              trabajadorId: actualizada.trabajadorId,
            },
          },
        },
      }
    );
  }

  broadcast(RT_EVENTS.EQUIPMENT_CHANGED, {
    action: "custody-accepted",
    id: String(actualizada._id),
  });
  broadcast(RT_EVENTS.ASSIGNMENT_CHANGED, {
    action: "accepted",
    id: String(actualizada._id),
    estado: actualizada.estado,
    trabajadorId: actualizada.trabajadorId,
    origenTipo: actualizada.origenTipo,
    origenId: String(actualizada.origenId),
  });

  return serializarCustodia(actualizada.toObject(), {
    incluirHistorial: true,
  });
};

export const reiniciarVerificacion = async ({ id, usuario = {} }) => {
  const { custodia } = await buscarCustodia(id);

  if (custodia.estado !== "Pendiente") {
    error(409, "Solo se pueden reiniciar intentos de una Assignment pendiente");
  }

  const actualizada = await EquipmentCustody.findOneAndUpdate(
    { _id: custodia._id, estado: "Pendiente" },
    {
      $set: {
        "aceptacion.intentos": 0,
        "aceptacion.bloqueada": false,
      },
      $push: {
        historial: {
          tipo: "verificacion_reiniciada",
          detalle: "Se reiniciaron los intentos de verificación",
          por: texto(usuario.nombre),
          porId: texto(usuario.id),
          el: new Date(),
          meta: {},
        },
      },
    },
    { new: true }
  );

  if (!actualizada) {
    error(409, "La Assignment fue modificada por otro usuario");
  }

  broadcast(RT_EVENTS.ASSIGNMENT_CHANGED, {
    action: "verification-reset",
    id: String(actualizada._id),
    estado: actualizada.estado,
    trabajadorId: actualizada.trabajadorId,
    origenTipo: actualizada.origenTipo,
    origenId: String(actualizada.origenId),
  });

  return serializarCustodia(actualizada.toObject(), {
    incluirHistorial: true,
  });
};

const descripcionNovedad = (items) => {
  const resumen = resumenNovedades(items);
  return {
    tipo:
      resumen.total === 1
        ? resumen.equipos[0]?.tipo === "Pérdida"
          ? "Equipo perdido"
          : resumen.equipos[0]?.tipo === "Daño"
            ? "Equipo dañado"
            : "Novedad de equipos"
        : "Novedad de equipos",
    texto: resumen.equipos
      .map(
        (item) =>
          `${item.placa || "Equipo"}: ${item.tipo} · ${item.descripcion} · ${item.accion}`
      )
      .join("\n"),
  };
};

const crearNovedad = async ({ custodia, items, usuario }) => {
  if (!custodia.trabajadorGrupoId) {
    error(
      409,
      "El trabajador no tiene grupo; no se puede crear la novedad de la descarga"
    );
  }

  const { tipo, texto: descripcion } = descripcionNovedad(items);
  const novedad = await Novelty.create({
    grupoID: custodia.trabajadorGrupoId,
    esGeneralGrupo: false,
    colaboradorNombre: custodia.trabajadorNombre,
    cargo: custodia.trabajadorCargo || "Equipos",
    tipo,
    descripcion,
    administradorReporto: texto(usuario.nombre),
    fechaHoraReporte: new Date().toLocaleString("es-CO"),
    estado: "Pendiente",
  });

  broadcast(RT_EVENTS.CREATED, novedad);
  return novedad;
};

const restaurarEquipo = async ({
  equipoId,
  anterior,
  mantenimientoId,
  incidenteId,
  reservaId,
  descargaToken,
}) => {
  const update = {
    $set: {
      estado: anterior.estado,
      motivoInactivo: anterior.motivoInactivo,
      custodiaActivaId: anterior.custodiaActivaId,
    },
    $pull: {
      hojaDeVida: { "meta.descargaToken": descargaToken },
    },
  };

  if (mantenimientoId) {
    update.$pull.mantenimientos = {
      _id: new mongoose.Types.ObjectId(mantenimientoId),
    };
  }

  await Equipment.updateOne({ _id: equipoId }, update).catch(() => {});

  if (incidenteId) {
    await EquipmentIncident.deleteOne({ _id: incidenteId }).catch(() => {});
  }

  if (reservaId) {
    await EquipmentAssignment.updateOne(
      { _id: reservaId, estado: "Liberada" },
      {
        $set: { estado: "Activa" },
        $unset: {
          liberadoPor: "",
          liberadoPorId: "",
          liberadoEn: "",
          motivoLiberacion: "",
        },
      }
    ).catch(() => {});
  }
};

export const descargarCustodia = async ({
  id,
  equipos = [],
  revisadoFisicamente,
  observaciones = "",
  usuario = {},
}) => {
  const { custodia } = await buscarCustodia(id);

  if (custodia.estado !== "Activa") {
    error(409, "Solo se puede descargar una Assignment activa");
  }

  if (
    custodia.descargaEnProceso &&
    custodia.descargaIniciadaEn &&
    Date.now() - new Date(custodia.descargaIniciadaEn).getTime() < 5 * 60 * 1000
  ) {
    error(409, "La descarga de esta Assignment ya está en proceso");
  }

  const validacion = validarDescarga({
    equiposCustodia: custodia.equipos,
    items: equipos,
    revisadoFisicamente,
  });
  if (validacion.error) error(400, validacion.error);

  const ahora = new Date();
  const reclamada = await EquipmentCustody.findOneAndUpdate(
    {
      _id: custodia._id,
      estado: "Activa",
      $or: [
        { descargaEnProceso: false },
        { descargaIniciadaEn: null },
        {
          descargaIniciadaEn: {
            $lt: new Date(ahora.getTime() - 5 * 60 * 1000),
          },
        },
      ],
    },
    {
      $set: {
        descargaEnProceso: true,
        descargaIniciadaEn: ahora,
      },
    },
    { new: true }
  );

  if (!reclamada) {
    error(409, "La descarga de esta Assignment ya está en proceso");
  }

  const custodiaActual = reclamada;
  const itemsValidos = validacion.items;
  const conNovedad = itemsValidos.filter(
    (item) => item.resultado === "Con novedad"
  );

  let equiposDocs = [];
  try {
    equiposDocs = await Equipment.find({
      _id: { $in: itemsValidos.map((item) => item.equipoId) },
    });
  } catch (err) {
    await EquipmentCustody.updateOne(
      { _id: custodiaActual._id },
      { $set: { descargaEnProceso: false, descargaIniciadaEn: null } }
    ).catch(() => {});
    throw err;
  }

  const equiposPorId = new Map(
    equiposDocs.map((equipo) => [String(equipo._id), equipo])
  );

  for (const item of itemsValidos) {
    const equipo = equiposPorId.get(item.equipoId);
    let invalidado = null;
    if (!equipo) {
      invalidado = "Uno de los equipos de la Assignment ya no existe";
    } else if (
      String(equipo.custodiaActivaId) !== String(custodiaActual._id)
    ) {
      invalidado =
        "Uno de los equipos ya no está bloqueado por esta Assignment";
    }

    if (invalidado) {
      await EquipmentCustody.updateOne(
        { _id: custodiaActual._id },
        { $set: { descargaEnProceso: false, descargaIniciadaEn: null } }
      ).catch(() => {});
      error(409, invalidado);
    }
  }

  const descargaToken = new mongoose.Types.ObjectId().toString();
  const cambios = [];
  let novedad = null;
  let incidenteCreado = null;

  try {
    if (conNovedad.length > 0) {
      novedad = await crearNovedad({
        custodia: custodiaActual,
        items: itemsValidos,
        usuario,
      });
    }

    const itemsCustodia = new Map(
      (custodiaActual.equipos ?? []).map((item) => [
        String(item.equipoId),
        item,
      ])
    );

    for (const item of itemsValidos) {
      const equipo = equiposPorId.get(item.equipoId);
      const itemCustodia = itemsCustodia.get(item.equipoId);
      const reservaId = itemCustodia?.reservaId;
      const anterior = {
        estado: equipo.estado,
        motivoInactivo: equipo.motivoInactivo ?? null,
        custodiaActivaId: equipo.custodiaActivaId,
      };

      const cambio = {
        equipoId: item.equipoId,
        anterior,
        mantenimientoId: null,
        incidenteId: null,
        reservaId: reservaId ? String(reservaId) : null,
      };

      // Se registra antes de tocar el equipo/reserva para que el rollback
      // cubra también una falla en la mitad de este ítem.
      cambios.push(cambio);

      await liberarReserva({
        reservaId,
        usuario,
        motivo: `Descarga de la Assignment ${custodiaActual.codigo}`,
      });

      if (item.resultado === "Sin novedad") {
        equipo.custodiaActivaId = null;
        agregarEvento(equipo, {
          tipo: "custodia_descargada",
          titulo: "Equipo descargado sin novedad",
          detalle: `${custodiaActual.codigo} · ${custodiaActual.trabajadorNombre}`,
          estadoAnterior: "Asignado",
          estadoNuevo: "Disponible",
          por: texto(usuario.nombre),
          porId: texto(usuario.id),
          meta: {
            custodiaId: String(custodiaActual._id),
            descargaToken,
            codigo: custodiaActual.codigo,
          },
        });
        await equipo.save();

        if (itemCustodia) {
          itemCustodia.estado = "Descargado";
          itemCustodia.resultadoDescarga = "Sin novedad";
        }
        continue;
      }

      if (item.accionNovedad === "Mantenimiento") {
        const mantenimiento = crearRegistroMantenimiento({
          equipo,
          usuario,
          tipo: "Correctivo",
          descripcion: `${custodiaActual.codigo} · ${item.novedadDescripcion}`,
          seguimiento: crearSeguimientoDescarga(),
        });

        // El helper agrega una entrada de hoja de vida; la marcamos para poder
        // revertirla si la descarga falla a mitad.
        const ultima = equipo.hojaDeVida[equipo.hojaDeVida.length - 1];
        if (ultima) {
          ultima.meta = {
            ...(ultima.meta ?? {}),
            descargaToken,
            custodiaId: String(custodiaActual._id),
          };
        }

        equipo.custodiaActivaId = null;
        agregarEvento(equipo, {
          tipo: "novedad_descarga",
          titulo: "Novedad reportada en la descarga",
          detalle: `${item.novedadTipo}: ${item.novedadDescripcion}`,
          estadoAnterior: "Asignado",
          estadoNuevo: "Mantenimiento",
          por: texto(usuario.nombre),
          porId: texto(usuario.id),
          meta: {
            custodiaId: String(custodiaActual._id),
            descargaToken,
            novedadId: novedad ? String(novedad._id) : null,
            mantenimientoId: String(mantenimiento._id),
          },
        });
        await equipo.save();

        cambio.mantenimientoId = String(mantenimiento._id);

        if (itemCustodia) {
          itemCustodia.estado = "Descargado";
          itemCustodia.resultadoDescarga = "Con novedad";
          itemCustodia.novedadTipo = item.novedadTipo;
          itemCustodia.novedadDescripcion = item.novedadDescripcion;
          itemCustodia.accionNovedad = "Mantenimiento";
          itemCustodia.mantenimientoId = mantenimiento._id;
        }
        continue;
      }

      if (item.accionNovedad === "Caso especial") {
        const incidente = await EquipmentIncident.create({
          equipoId: equipo._id,
          placaSnapshot: equipo.placa,
          custodiaId: custodiaActual._id,
          trabajadorId: custodiaActual.trabajadorId,
          trabajadorNombre: custodiaActual.trabajadorNombre,
          origenTipo: custodiaActual.origenTipo,
          origenId: custodiaActual.origenId,
          origenCodigo: custodiaActual.origenCodigo,
          tipo: item.novedadTipo,
          descripcion: item.novedadDescripcion,
          estado: "Abierto",
          reportadoPor: texto(usuario.nombre),
          reportadoPorId: texto(usuario.id),
          reportadoEn: new Date(),
        });

        incidenteCreado = incidente;
        cambio.incidenteId = String(incidente._id);

        equipo.custodiaActivaId = null;
        equipo.estado = "Inactivo";
        equipo.motivoInactivo = "Novedad";
        equipo.actualizadoPor = texto(usuario.nombre);
        equipo.actualizadoPorId = texto(usuario.id);
        agregarEvento(equipo, {
          tipo: "novedad_descarga",
          titulo: "Equipo enviado a caso especial",
          detalle: `${item.novedadTipo}: ${item.novedadDescripcion}`,
          estadoAnterior: "Asignado",
          estadoNuevo: "Novedad",
          por: texto(usuario.nombre),
          porId: texto(usuario.id),
          meta: {
            custodiaId: String(custodiaActual._id),
            descargaToken,
            novedadId: novedad ? String(novedad._id) : null,
            incidenteId: String(incidente._id),
          },
        });
        await equipo.save();

        if (itemCustodia) {
          itemCustodia.estado = "Descargado";
          itemCustodia.resultadoDescarga = "Con novedad";
          itemCustodia.novedadTipo = item.novedadTipo;
          itemCustodia.novedadDescripcion = item.novedadDescripcion;
          itemCustodia.accionNovedad = "Caso especial";
          itemCustodia.incidenteId = incidente._id;
        }
      }
    }

    custodiaActual.estado = "Cerrada";
    custodiaActual.activa = false;
    custodiaActual.descargaEnProceso = false;
    custodiaActual.descargaIniciadaEn = null;
    custodiaActual.descarga = {
      realizadaPor: texto(usuario.nombre),
      realizadaPorId: texto(usuario.id),
      realizadaEn: new Date(),
      revisadoFisicamente: true,
      resultado: validacion.resultado,
      observaciones: texto(observaciones),
      novedadId: novedad ? novedad._id : null,
      aprobadaPor: texto(usuario.nombre),
      aprobadaPorId: texto(usuario.id),
    };

    registrarHistorial(custodiaActual, {
      tipo: "descarga",
      detalle: `Descarga ${validacion.resultado}`,
      por: usuario.nombre,
      porId: usuario.id,
      meta: {
        resultado: validacion.resultado,
        novedadId: novedad ? String(novedad._id) : null,
        equipos: itemsValidos,
      },
    });

    await custodiaActual.save();
  } catch (err) {
    if (novedad) {
      await Novelty.deleteOne({ _id: novedad._id }).catch(() => {});
    }

    for (const cambio of cambios) {
      await restaurarEquipo({
        equipoId: cambio.equipoId,
        anterior: cambio.anterior,
        mantenimientoId: cambio.mantenimientoId,
        incidenteId: cambio.incidenteId,
        reservaId: cambio.reservaId,
        descargaToken,
      });
    }

    await EquipmentCustody.updateOne(
      { _id: custodiaActual._id },
      {
        $set: {
          descargaEnProceso: false,
          descargaIniciadaEn: null,
        },
      }
    ).catch(() => {});

    throw err;
  }

  broadcast(RT_EVENTS.EQUIPMENT_CHANGED, {
    action: "custody-downloaded",
    id: String(custodiaActual._id),
  });
  broadcast(RT_EVENTS.ASSIGNMENT_CHANGED, {
    action: "downloaded",
    id: String(custodiaActual._id),
    estado: custodiaActual.estado,
    trabajadorId: custodiaActual.trabajadorId,
    origenTipo: custodiaActual.origenTipo,
    origenId: String(custodiaActual.origenId),
  });
  broadcast(RT_EVENTS.EQUIPMENT_ASSIGNMENT_CHANGED, {
    action: "released",
    origenTipo: custodiaActual.origenTipo,
    origenId: String(custodiaActual.origenId),
  });

  if (incidenteCreado) {
    broadcast(RT_EVENTS.EQUIPMENT_INCIDENT_CHANGED, {
      action: "created",
      id: String(incidenteCreado._id),
      equipoId: String(incidenteCreado.equipoId),
      estado: incidenteCreado.estado,
    });
  }

  return serializarCustodia(custodiaActual.toObject(), {
    incluirHistorial: true,
  });
};

export const anularCustodia = async ({ id, motivo, usuario = {} }) => {
  const { custodia } = await buscarCustodia(id);

  if (custodia.estado !== "Pendiente") {
    error(
      409,
      "Solo se puede anular una Assignment pendiente. Una activa debe descargarse"
    );
  }

  const motivoFinal = texto(motivo);
  if (!motivoFinal) error(400, "Escribe el motivo de la anulación");

  custodia.estado = "Anulada";
  custodia.activa = false;
  custodia.anulada = {
    por: texto(usuario.nombre),
    porId: texto(usuario.id),
    en: new Date(),
    motivo: motivoFinal,
  };
  registrarHistorial(custodia, {
    tipo: "anulacion",
    detalle: motivoFinal,
    por: usuario.nombre,
    porId: usuario.id,
    meta: {},
  });
  await custodia.save();

  for (const item of custodia.equipos) {
    await Equipment.updateOne(
      {
        _id: item.equipoId,
        custodiaActivaId: custodia._id,
      },
      {
        $set: { custodiaActivaId: null },
        $push: {
          hojaDeVida: {
            tipo: "custodia_anulada",
            titulo: "Assignment anulada",
            detalle: `${custodia.codigo} · ${motivoFinal}`,
            estadoAnterior: "Asignado",
            estadoNuevo: "Disponible",
            por: texto(usuario.nombre),
            porId: texto(usuario.id),
            el: new Date(),
            meta: {
              custodiaId: String(custodia._id),
              codigo: custodia.codigo,
            },
          },
        },
      }
    );
  }

  broadcast(RT_EVENTS.EQUIPMENT_CHANGED, {
    action: "custody-cancelled",
    id: String(custodia._id),
  });
  broadcast(RT_EVENTS.ASSIGNMENT_CHANGED, {
    action: "cancelled",
    id: String(custodia._id),
    estado: custodia.estado,
    trabajadorId: custodia.trabajadorId,
    origenTipo: custodia.origenTipo,
    origenId: String(custodia.origenId),
  });

  return serializarCustodia(custodia.toObject(), {
    incluirHistorial: true,
  });
};

const filtroListado = ({
  estado,
  origenTipo,
  trabajadorId,
  q,
  evento,
  desde,
  hasta,
}) => {
  const filtro = {};

  if (estado === "Actuales") {
    filtro.estado = { $in: ["Pendiente", "Activa"] };
  } else if (texto(estado)) {
    filtro.estado = texto(estado);
  }

  if (texto(origenTipo)) filtro.origenTipo = texto(origenTipo);
  if (texto(trabajadorId)) filtro.trabajadorId = texto(trabajadorId);

  if (texto(evento)) {
    filtro.origenNombre = new RegExp(
      `^${escaparRegex(texto(evento))}$`,
      "i"
    );
  }

  if (texto(q)) {
    const patron = new RegExp(escaparRegex(texto(q)), "i");
    filtro.$or = [
      { codigo: patron },
      { trabajadorNombre: patron },
      { origenCodigo: patron },
      { origenNombre: patron },
      { "equipos.placaSnapshot": patron },
    ];
  }

  const rango = rangoFechas(desde, hasta);
  if (rango) filtro.origenFecha = rango;

  return filtro;
};

const resumenListado = async () => {
  const [pendientes, activas, cerradas, anuladas, novedadesAbiertas] =
    await Promise.all([
      EquipmentCustody.countDocuments({ estado: "Pendiente" }),
      EquipmentCustody.countDocuments({ estado: "Activa" }),
      EquipmentCustody.countDocuments({ estado: "Cerrada" }),
      EquipmentCustody.countDocuments({ estado: "Anulada" }),
      EquipmentIncident.countDocuments({ estado: { $ne: "Cerrado" } }),
    ]);

  const equiposEnCustodia = await Equipment.countDocuments({
    custodiaActivaId: { $ne: null },
  });

  return {
    pendientes,
    activas,
    cerradas,
    anuladas,
    equiposEnCustodia,
    novedadesAbiertas,
  };
};

export const listarCustodias = async ({
  estado,
  origenTipo,
  trabajadorId,
  q,
  evento,
  desde,
  hasta,
  page = 1,
  limit = 50,
} = {}) => {
  const filtro = filtroListado({
    estado,
    origenTipo,
    trabajadorId,
    q,
    evento,
    desde,
    hasta,
  });
  const pagina = Math.max(1, Number(page) || 1);
  const tamano = Math.min(100, Math.max(1, Number(limit) || 50));

  const [total, docs, resumen] = await Promise.all([
    EquipmentCustody.countDocuments(filtro),
    EquipmentCustody.find(filtro)
      .select("-historial")
      .sort({ createdAt: -1 })
      .skip((pagina - 1) * tamano)
      .limit(tamano)
      .lean(),
    resumenListado(),
  ]);

  const imagenesPorEquipo = await imagenesDeEquipos(
    docs.flatMap((doc) => lista(doc.equipos).map((item) => item.equipoId))
  );

  return {
    total,
    page: pagina,
    limit: tamano,
    resumen,
    assignments: docs.map((doc) =>
      serializarCustodia(doc, { incluirHistorial: false, imagenesPorEquipo })
    ),
  };
};

export const listarEventos = async ({
  estado,
  origenTipo,
  desde,
  hasta,
} = {}) => {
  const filtro = filtroListado({ estado, origenTipo, desde, hasta });

  const eventos = await EquipmentCustody.aggregate([
    { $match: filtro },
    {
      $group: {
        _id: { tipo: "$origenTipo", id: "$origenId" },
        tipo: { $first: "$origenTipo" },
        id: { $first: "$origenId" },
        codigo: { $first: "$origenCodigo" },
        nombre: { $first: "$origenNombre" },
        fecha: { $first: "$origenFecha" },
        estadoOrigen: { $first: "$origenEstado" },
        total: { $sum: 1 },
      },
    },
    { $match: { nombre: { $nin: ["", null] } } },
    { $sort: { fecha: 1, nombre: 1 } },
    { $limit: 200 },
  ]);

  return eventos.map((evento) => ({
    tipo: texto(evento.tipo),
    id: String(evento.id ?? ""),
    codigo: texto(evento.codigo),
    nombre: texto(evento.nombre),
    fecha: evento.fecha ?? null,
    estado: texto(evento.estadoOrigen),
    total: Number(evento.total) || 0,
  }));
};

export const custodiasActivasPorEquipo = async (equipoIds = []) => {
  const ids = lista(equipoIds)
    .map((id) => texto(id))
    .filter((id) => esObjectIdValido(id));
  if (ids.length === 0) return [];

  const custodias = await EquipmentCustody.find({
    activa: true,
    "equipos.equipoId": { $in: ids },
  })
    .select(
      "codigo estado trabajadorId trabajadorNombre equipos.equipoId equipos.estado creadaEn createdAt"
    )
    .lean();

  const filas = [];
  custodias.forEach((custodia) => {
    lista(custodia.equipos).forEach((item) => {
      if (!ids.includes(String(item.equipoId))) return;
      filas.push({
        equipoId: String(item.equipoId),
        custodia: {
          id: String(custodia._id),
          codigo: custodia.codigo,
          estado: custodia.estado,
          trabajadorNombre: custodia.trabajadorNombre,
          desde: custodia.createdAt ?? null,
        },
      });
    });
  });

  return filas;
};

export const tieneCustodiaActivaDeOrigen = async (origenTipo, origenId) => {
  if (!["Programmer", "Requirement"].includes(String(origenTipo))) return false;
  if (!esObjectIdValido(origenId)) return false;

  return Boolean(
    await EquipmentCustody.exists({
      origenTipo,
      origenId,
      activa: true,
    })
  );
};

export const custodiasActivasDeOrigen = async (origenTipo, origenId) => {
  if (!esObjectIdValido(origenId)) return [];
  return EquipmentCustody.find({
    origenTipo,
    origenId,
    activa: true,
  })
    .select("trabajadorId")
    .lean();
};


