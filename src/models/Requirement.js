/*
  Solicitud de Requirements: sistema de gestión por áreas (Comercial,
  Noticias, Bravissimo, Exteriores). Es una entidad distinta de Programmer,
  que sigue siendo el proceso manual interno de GM Citytv.
*/

import { Schema, model } from "mongoose";

const solicitanteSchema = new Schema(
  {
    nombre: { type: String, trim: true, default: "" },
    cargo: { type: String, trim: true, default: "" },
    correo: { type: String, trim: true, default: "" },
    telefono: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const asignadoSchema = new Schema(
  {
    Id: { type: String, trim: true },
    Nombre: { type: String, trim: true },
    Cargo: { type: String, trim: true },
    GrupoId: { type: String, trim: true },
    AsignadoEl: { type: Date },
    AsignadoPor: { type: String, trim: true },
    AsignadoPorId: { type: String, trim: true },
  },
  { _id: false }
);

const personalSchema = new Schema(
  {
    rolId: { type: String, trim: true, required: true },
    rol: { type: String, trim: true, default: "" },
    cantidad: { type: Number, default: 0 },
    horas: { type: Number, default: 0 },
    notas: { type: String, trim: true, default: "" },
    asignados: { type: [asignadoSchema], default: [] },
  },
  { _id: false }
);

const equipoSchema = new Schema(
  {
    inventarioId: { type: Schema.Types.ObjectId, ref: "Equipment", default: null },
    placa: { type: String, trim: true, default: "" },
    categoria: { type: String, trim: true, default: "" },
    subcategoria: { type: String, trim: true, default: "" },
    descripcion: { type: String, trim: true, default: "" },
    imagenActualizadaEn: { type: Date, default: null },
    restricciones: { type: [String], default: [] },
    restriccionesAceptadasPor: { type: String, trim: true, default: "" },
    restriccionesAceptadasPorId: { type: String, trim: true, default: "" },
    restriccionesAceptadasEl: { type: Date, default: null },
    cantidad: { type: Number, default: 1 },
    notas: { type: String, trim: true, default: "" },
    estadoInventario: { type: String, trim: true, default: "Pendiente" },
  },
  { _id: false }
);

const eventoSchema = new Schema(
  {
    programa: { type: String, trim: true, default: "" },
    tipoEvento: { type: String, trim: true, default: "" },
    fecha: { type: Date, required: true },
    horaInicio: { type: String, trim: true, default: "" },
    horaFin: { type: String, trim: true, default: "" },
    locacion: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const historialSchema = new Schema(
  {
    tipo: { type: String, trim: true, required: true },
    estadoAnterior: { type: String, trim: true, default: "" },
    estadoNuevo: { type: String, trim: true, default: "" },
    por: { type: String, trim: true, default: "" },
    porId: { type: String, trim: true, default: "" },
    el: { type: Date, default: Date.now },
    nota: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const requirementSchema = new Schema(
  {
    codigo: { type: String, trim: true, unique: true, sparse: true },
    nombre: { type: String, required: true, trim: true },
    departamentoId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    departamentoNombre: { type: String, trim: true, default: "" },
    evento: { type: eventoSchema, required: true },
    personal: { type: [personalSchema], default: [] },
    equipos: { type: [equipoSchema], default: [] },
    prioridad: {
      type: String,
      trim: true,
      default: "Media",
    },
    estado: {
      type: String,
      trim: true,
      enum: ["Pendiente", "En revisión", "Aprobada", "Agendado", "Rechazada"],
      default: "Pendiente",
    },
    solicitante: { type: solicitanteSchema, default: {} },
    descripcion: { type: String, trim: true, default: "" },
    observacion: { type: String, trim: true, default: "" },
    historial: { type: [historialSchema], default: [] },
    revision: { type: Number, default: 0 },
    creadoPor: { type: String, trim: true, default: "" },
    creadoPorId: { type: String, trim: true, default: "" },
    actualizadoPor: { type: String, trim: true, default: "" },
    actualizadoPorId: { type: String, trim: true, default: "" },
    decididoPor: { type: String, trim: true, default: "" },
    decididoPorId: { type: String, trim: true, default: "" },
    decididoEn: { type: Date, default: null },
    motivoDecision: { type: String, trim: true, default: "" },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

requirementSchema.index({ departamentoId: 1, estado: 1 });
requirementSchema.index({ "evento.fecha": 1 });

export default model("Requirement", requirementSchema);
