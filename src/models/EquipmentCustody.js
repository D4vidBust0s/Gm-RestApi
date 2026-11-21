/*
  Assignment de equipos: custodia de uno o varios equipos entregados a un
  trabajador para un Programmer o un Requirement aprobado/agendado.

  El documento es la fuente de auditoría de la carga y la descarga. El bloqueo
  operativo del equipo vive en Equipment.custodiaActivaId para que la
  disponibilidad y las reservas lo consulten sin recorrer custodias.
*/

import { Schema, model } from "mongoose";

const equipoCustodiaSchema = new Schema(
  {
    equipoId: {
      type: Schema.Types.ObjectId,
      ref: "Equipment",
      required: true,
    },
    placaSnapshot: { type: String, trim: true, default: "" },
    descripcionSnapshot: { type: String, trim: true, default: "" },
    categoriaSnapshot: { type: String, trim: true, default: "" },
    subcategoriaSnapshot: { type: String, trim: true, default: "" },
    reservaId: {
      type: Schema.Types.ObjectId,
      ref: "EquipmentAssignment",
      default: null,
    },
    estado: {
      type: String,
      enum: ["Pendiente", "Entregado", "Descargado"],
      default: "Pendiente",
    },
    resultadoDescarga: {
      type: String,
      enum: ["Sin novedad", "Con novedad", null],
      default: null,
    },
    novedadTipo: {
      type: String,
      enum: ["Daño", "Pérdida", "Otro", null],
      default: null,
    },
    novedadDescripcion: { type: String, trim: true, default: "" },
    accionNovedad: {
      type: String,
      enum: ["Mantenimiento", "Caso especial", null],
      default: null,
    },
    mantenimientoId: { type: Schema.Types.ObjectId, default: null },
    incidenteId: { type: Schema.Types.ObjectId, default: null },
  },
  { _id: true }
);

const historialSchema = new Schema(
  {
    tipo: { type: String, required: true, trim: true },
    detalle: { type: String, trim: true, default: "" },
    por: { type: String, trim: true, default: "" },
    porId: { type: String, trim: true, default: "" },
    el: { type: Date, default: Date.now },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: true }
);

const aceptacionSchema = new Schema(
  {
    metodo: {
      type: String,
      enum: ["temporal", "app"],
      default: "temporal",
    },
    estado: {
      type: String,
      enum: ["Pendiente", "Aceptada"],
      default: "Pendiente",
    },
    intentos: { type: Number, default: 0, min: 0 },
    bloqueada: { type: Boolean, default: false },
    revisadoFisicamente: { type: Boolean, default: false },
    aceptadaEn: { type: Date, default: null },
    registradaPor: { type: String, trim: true, default: "" },
    registradaPorId: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const descargaSchema = new Schema(
  {
    realizadaPor: { type: String, trim: true, default: "" },
    realizadaPorId: { type: String, trim: true, default: "" },
    realizadaEn: { type: Date, default: null },
    revisadoFisicamente: { type: Boolean, default: false },
    resultado: {
      type: String,
      enum: ["Sin novedad", "Con novedad", null],
      default: null,
    },
    observaciones: { type: String, trim: true, default: "" },
    novedadId: { type: Schema.Types.ObjectId, ref: "Novelty", default: null },
    aprobadaPor: { type: String, trim: true, default: "" },
    aprobadaPorId: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const anuladaSchema = new Schema(
  {
    por: { type: String, trim: true, default: "" },
    porId: { type: String, trim: true, default: "" },
    en: { type: Date, default: null },
    motivo: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const equipmentCustodySchema = new Schema(
  {
    codigo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    origenTipo: {
      type: String,
      enum: ["Programmer", "Requirement"],
      required: true,
    },
    origenId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    origenCodigo: { type: String, trim: true, default: "" },
    origenNombre: { type: String, trim: true, default: "" },
    origenFecha: { type: Date, default: null },
    origenEstado: { type: String, trim: true, default: "" },
    trabajadorId: { type: String, trim: true, required: true },
    trabajadorNombre: { type: String, trim: true, default: "" },
    trabajadorCargo: { type: String, trim: true, default: "" },
    trabajadorGrupoId: { type: String, trim: true, default: "" },
    trabajadorGrupoNombre: { type: String, trim: true, default: "" },
    estado: {
      type: String,
      enum: ["Pendiente", "Activa", "Cerrada", "Anulada"],
      default: "Pendiente",
    },
    activa: { type: Boolean, default: true },
    observaciones: { type: String, trim: true, default: "" },
    equipos: { type: [equipoCustodiaSchema], default: [] },
    aceptacion: { type: aceptacionSchema, default: () => ({}) },
    creadaPor: { type: String, trim: true, default: "" },
    creadaPorId: { type: String, trim: true, default: "" },
    creadaEn: { type: Date, default: Date.now },
    descarga: { type: descargaSchema, default: () => ({}) },
    descargaEnProceso: { type: Boolean, default: false },
    descargaIniciadaEn: { type: Date, default: null },
    anulada: { type: anuladaSchema, default: () => ({}) },
    historial: { type: [historialSchema], default: [] },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

equipmentCustodySchema.index({ origenTipo: 1, origenId: 1, estado: 1 });
equipmentCustodySchema.index({ activa: 1, trabajadorId: 1 });
equipmentCustodySchema.index({ createdAt: -1 });
equipmentCustodySchema.index({ origenFecha: 1 });
equipmentCustodySchema.index(
  { origenTipo: 1, origenId: 1, trabajadorId: 1 },
  {
    unique: true,
    partialFilterExpression: { activa: true },
    name: "custodia_activa_por_trabajador_origen",
  }
);

export default model("EquipmentCustody", equipmentCustodySchema);
