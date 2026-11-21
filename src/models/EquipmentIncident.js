/*
  Caso especial de seguimiento de un equipo reportado con novedad durante una
  descarga de Assignment. El equipo queda Inactivo/Novedad hasta que el caso se
  cierre como Disponible o Baja.
*/

import { Schema, model } from "mongoose";

const notaSchema = new Schema(
  {
    texto: { type: String, required: true, trim: true },
    por: { type: String, trim: true, default: "" },
    porId: { type: String, trim: true, default: "" },
    el: { type: Date, default: Date.now },
  },
  { _id: true }
);

const resolucionSchema = new Schema(
  {
    resultado: {
      type: String,
      enum: ["Disponible", "Baja", null],
      default: null,
    },
    nota: { type: String, trim: true, default: "" },
    por: { type: String, trim: true, default: "" },
    porId: { type: String, trim: true, default: "" },
    el: { type: Date, default: null },
  },
  { _id: false }
);

const equipmentIncidentSchema = new Schema(
  {
    equipoId: {
      type: Schema.Types.ObjectId,
      ref: "Equipment",
      required: true,
    },
    placaSnapshot: { type: String, trim: true, default: "" },
    custodiaId: {
      type: Schema.Types.ObjectId,
      ref: "EquipmentCustody",
      default: null,
    },
    trabajadorId: { type: String, trim: true, default: "" },
    trabajadorNombre: { type: String, trim: true, default: "" },
    origenTipo: {
      type: String,
      enum: ["Programmer", "Requirement"],
      default: "Programmer",
    },
    origenId: { type: Schema.Types.ObjectId, default: null },
    origenCodigo: { type: String, trim: true, default: "" },
    tipo: {
      type: String,
      enum: ["Daño", "Pérdida", "Otro"],
      required: true,
    },
    descripcion: { type: String, required: true, trim: true },
    estado: {
      type: String,
      enum: ["Abierto", "En seguimiento", "Cerrado"],
      default: "Abierto",
    },
    notas: { type: [notaSchema], default: [] },
    reportadoPor: { type: String, trim: true, default: "" },
    reportadoPorId: { type: String, trim: true, default: "" },
    reportadoEn: { type: Date, default: Date.now },
    resolucion: { type: resolucionSchema, default: () => ({}) },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

equipmentIncidentSchema.index({ estado: 1, createdAt: -1 });
equipmentIncidentSchema.index({ equipoId: 1 });
equipmentIncidentSchema.index({ custodiaId: 1 });

export default model("EquipmentIncident", equipmentIncidentSchema);
