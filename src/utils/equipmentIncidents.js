/*
  Seguimiento de los casos especiales abiertos desde una descarga con novedad.
  El equipo permanece Inactivo/Novedad hasta el cierre del caso.
*/

import Equipment from "../models/Equipment";
import EquipmentIncident from "../models/EquipmentIncident";
import { broadcast, RT_EVENTS } from "../realtime";
import { agregarEvento } from "./equipmentHistory";
import { esObjectIdValido } from "./equipmentRules";
import { serializarIncidente } from "./assignmentSerializer";

const texto = (valor) => String(valor ?? "").trim();

const error = (status, message) => {
  const err = new Error(message);
  err.status = status;
  throw err;
};

const escaparRegex = (valor) =>
  String(valor ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const listarIncidentes = async ({ estado, q } = {}) => {
  const filtro = {};
  if (texto(estado)) filtro.estado = texto(estado);
  if (texto(q)) {
    const patron = new RegExp(escaparRegex(texto(q)), "i");
    filtro.$or = [
      { placaSnapshot: patron },
      { trabajadorNombre: patron },
      { origenCodigo: patron },
      { descripcion: patron },
    ];
  }

  const incidentes = await EquipmentIncident.find(filtro)
    .sort({ createdAt: -1 })
    .limit(300)
    .lean();

  return incidentes.map((incidente) => serializarIncidente(incidente));
};

export const obtenerIncidente = async (id) => {
  if (!esObjectIdValido(id)) error(400, "El caso no es válido");
  const incidente = await EquipmentIncident.findById(id).lean();
  if (!incidente) error(404, "El caso especial no existe");
  return serializarIncidente(incidente);
};

export const agregarNotaIncidente = async ({ id, texto: contenido, usuario }) => {
  const nota = texto(contenido);
  if (!nota) error(400, "Escribe la nota de seguimiento");

  const incidente = await EquipmentIncident.findById(id);
  if (!incidente) error(404, "El caso especial no existe");
  if (incidente.estado === "Cerrado") {
    error(409, "El caso ya está cerrado");
  }

  incidente.notas.push({
    texto: nota,
    por: texto(usuario.nombre),
    porId: texto(usuario.id),
    el: new Date(),
  });
  incidente.estado = "En seguimiento";
  await incidente.save();

  broadcast(RT_EVENTS.EQUIPMENT_INCIDENT_CHANGED, {
    action: "note",
    id: String(incidente._id),
    equipoId: String(incidente.equipoId),
    estado: incidente.estado,
  });

  return serializarIncidente(incidente.toObject());
};

export const cerrarIncidente = async ({
  id,
  resultado,
  nota,
  usuario,
}) => {
  const decision = texto(resultado);
  if (!["Disponible", "Baja"].includes(decision)) {
    error(400, "El resultado debe ser Disponible o Baja");
  }

  const incidente = await EquipmentIncident.findById(id);
  if (!incidente) error(404, "El caso especial no existe");
  if (incidente.estado === "Cerrado") {
    error(409, "El caso ya está cerrado");
  }

  const equipo = await Equipment.findById(incidente.equipoId);
  if (!equipo) error(404, "El equipo del caso no existe");
  if (equipo.custodiaActivaId) {
    error(
      409,
      "El equipo tiene una Assignment activa; descárgala antes de cerrar el caso"
    );
  }

  const notaFinal = texto(nota);
  const anterior = equipo.estado === "Inactivo" ? equipo.motivoInactivo : "Activo";

  if (decision === "Disponible") {
    equipo.estado = "Activo";
    equipo.motivoInactivo = null;
  } else {
    equipo.estado = "Inactivo";
    equipo.motivoInactivo = "Baja";
  }

  equipo.actualizadoPor = texto(usuario.nombre);
  equipo.actualizadoPorId = texto(usuario.id);

  agregarEvento(equipo, {
    tipo: "caso_especial_cerrado",
    titulo: `Caso especial cerrado: ${decision}`,
    detalle: notaFinal || texto(incidente.descripcion),
    estadoAnterior: anterior,
    estadoNuevo: decision === "Disponible" ? "Disponible" : "Baja",
    por: texto(usuario.nombre),
    porId: texto(usuario.id),
    meta: {
      incidenteId: String(incidente._id),
      resultado: decision,
    },
  });

  await equipo.save();

  incidente.estado = "Cerrado";
  incidente.resolucion = {
    resultado: decision,
    nota: notaFinal,
    por: texto(usuario.nombre),
    porId: texto(usuario.id),
    el: new Date(),
  };
  await incidente.save();

  broadcast(RT_EVENTS.EQUIPMENT_CHANGED, {
    action: "incident-closed",
    id: String(equipo._id),
  });
  broadcast(RT_EVENTS.EQUIPMENT_INCIDENT_CHANGED, {
    action: "closed",
    id: String(incidente._id),
    equipoId: String(incidente.equipoId),
    estado: incidente.estado,
  });

  return serializarIncidente(incidente.toObject());
};
