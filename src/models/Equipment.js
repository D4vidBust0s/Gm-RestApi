/*
  Equipo físico del inventario de GM-Activos.

  La placa es la identidad física (código de barras) y es única. El estado
  persistido es Activo/Inactivo con un motivo de inactividad; "Asignado" y
  "Disponible" se derivan de las reservas activas para no contradecir la
  agenda real.
*/

import { Schema, model } from "mongoose";

const observacionSchema = new Schema(
  {
    texto: { type: String, required: true, trim: true },
    por: { type: String, trim: true, default: "" },
    porId: { type: String, trim: true, default: "" },
    creadoEn: { type: Date, default: Date.now },
    editadoEn: { type: Date, default: null },
  },
  { _id: true }
);

const restriccionSchema = new Schema(
  {
    texto: { type: String, required: true, trim: true },
    por: { type: String, trim: true, default: "" },
    porId: { type: String, trim: true, default: "" },
    creadoEn: { type: Date, default: Date.now },
  },
  { _id: true }
);

const anotacionSchema = new Schema(
  {
    texto: { type: String, required: true, trim: true },
    por: { type: String, trim: true, default: "" },
    porId: { type: String, trim: true, default: "" },
    creadoEn: { type: Date, default: Date.now },
  },
  { _id: true }
);

const pasoSchema = new Schema(
  {
    texto: { type: String, required: true, trim: true },
    // Avance acumulado reportado al cerrar el paso (0-100). null en pasos
    // anteriores a esta función.
    avance: { type: Number, min: 0, max: 100, default: null },
    por: { type: String, trim: true, default: "" },
    porId: { type: String, trim: true, default: "" },
    creadoEn: { type: Date, default: Date.now },
  },
  { _id: true }
);

const seguimientoSchema = new Schema(
  {
    estado: {
      type: String,
      enum: ["Pendiente", "Finalizado"],
      default: "Pendiente",
    },
    inicio: { type: Date, default: null },
    fin: { type: Date, default: null },
    nota: { type: String, trim: true, default: "" },
    cerradoPor: { type: String, trim: true, default: "" },
    cerradoPorId: { type: String, trim: true, default: "" },
    anotaciones: { type: [anotacionSchema], default: [] },
  },
  { _id: false }
);

const mantenimientoSchema = new Schema(
  {
    tipo: {
      type: String,
      enum: ["Preventivo", "Correctivo"],
      default: "Preventivo",
    },
    descripcion: { type: String, trim: true, default: "" },
    tecnico: { type: String, trim: true, default: "" },
    // Campos legados: se conservan para no perder el historial, pero ya no se
    // escriben ni se exponen en el contrato de la API.
    costo: { type: Number, default: 0 },
    programadoPara: { type: Date, default: null },
    seguimiento: { type: seguimientoSchema, default: null },
    progreso: { type: Number, min: 0, max: 100, default: 0 },
    pasos: { type: [pasoSchema], default: [] },
    iniciadoEn: { type: Date, default: Date.now },
    finalizadoEn: { type: Date, default: null },
    estado: {
      type: String,
      enum: ["En proceso", "Finalizado"],
      default: "En proceso",
    },
    resultado: {
      type: String,
      enum: ["Disponible", "Baja", null],
      default: null,
    },
    por: { type: String, trim: true, default: "" },
    porId: { type: String, trim: true, default: "" },
    finalizadoPor: { type: String, trim: true, default: "" },
    finalizadoPorId: { type: String, trim: true, default: "" },
  },
  { _id: true }
);

const historialSchema = new Schema(
  {
    tipo: { type: String, required: true, trim: true },
    titulo: { type: String, trim: true, default: "" },
    detalle: { type: String, trim: true, default: "" },
    estadoAnterior: { type: String, trim: true, default: null },
    estadoNuevo: { type: String, trim: true, default: null },
    por: { type: String, trim: true, default: "" },
    porId: { type: String, trim: true, default: "" },
    el: { type: Date, default: Date.now },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: true }
);

const equipmentSchema = new Schema(
  {
    placa: {
      type: String,
      required: true,
      trim: true,
    },
    placaClave: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    categoriaId: {
      type: Schema.Types.ObjectId,
      ref: "EquipmentCategory",
      required: true,
    },
    subcategoriaId: {
      type: Schema.Types.ObjectId,
      ref: "EquipmentSubcategory",
      default: null,
    },
    ubicacionId: {
      type: Schema.Types.ObjectId,
      ref: "EquipmentLocation",
      required: true,
    },
    // Descripción técnica: ya no se pide por equipo. La visible se hereda de
    // la subcategoría (o de la categoría) y este campo queda como texto legado
    // de respaldo para los registros anteriores.
    descripcion: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000,
    },
    estado: {
      type: String,
      enum: ["Activo", "Inactivo"],
      default: "Inactivo",
    },
    motivoInactivo: {
      type: String,
      enum: ["Mantenimiento", "Protegido", "Baja", "Novedad", null],
      default: "Protegido",
    },
    // Assignment activa (Pendiente o Activa). Es el bloqueo operativo que
    // impide reservar el equipo en otro Programmer/Requirement hasta que un
    // almacenista lo descargue.
    custodiaActivaId: {
      type: Schema.Types.ObjectId,
      ref: "EquipmentCustody",
      default: null,
    },
    observaciones: {
      type: [observacionSchema],
      default: [],
    },
    restricciones: {
      type: [restriccionSchema],
      default: [],
    },
    mantenimientos: {
      type: [mantenimientoSchema],
      default: [],
    },
    hojaDeVida: {
      type: [historialSchema],
      default: [],
    },
    creadoPor: { type: String, trim: true, default: "" },
    creadoPorId: { type: String, trim: true, default: "" },
    actualizadoPor: { type: String, trim: true, default: "" },
    actualizadoPorId: { type: String, trim: true, default: "" },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

equipmentSchema.index({ categoriaId: 1, estado: 1 });
equipmentSchema.index({ subcategoriaId: 1, estado: 1 });
equipmentSchema.index({ ubicacionId: 1, estado: 1 });
equipmentSchema.index({ custodiaActivaId: 1 });

export default model("Equipment", equipmentSchema);
