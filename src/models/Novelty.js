/*
  Archivo que modela los datos para las novedades operativas (individuales o de grupo)
*/

import { Schema, model } from "mongoose";

const noveltySchema = new Schema({
  grupoID: {
    type: Schema.Types.ObjectId,
    ref: "Groups",
    required: true,
    trim: true,
  },
  esGeneralGrupo: {
    type: Boolean,
    default: false,
  },
  colaboradorNombre: {
    type: String,
    required: true,
    trim: true,
  },
  cargo: {
    type: String,
    required: true,
    trim: true,
  },
  tipo: {
    type: String,
    required: true,
    trim: true, // Ej: Permiso, Descanso, Incapacidad, Ausencia, Otro: Detalle
  },
  descripcion: {
    type: String,
    required: true,
    trim: true,
  },
  administradorReporto: {
    type: String,
    required: true,
    trim: true,
  },
  fechaHoraReporte: {
    type: String,
    required: true,
  },
  estado: {
    type: String,
    enum: ["Pendiente", "Solucionado"],
    default: "Pendiente",
  },
  solucion: {
    texto: { type: String, trim: true },
    administradorSolucion: { type: String, trim: true },
    fechaHoraSolucion: { type: String },
  }
}, {
  versionKey: false,
  timestamps: true,
});

export default model("Novelty", noveltySchema);