/*
  Reserva de una placa concreta para un requerimiento (Programmer o
  Requirements) en una franja determinada. Es la pieza que impide aprobar dos
  veces el mismo equipo a la misma hora.
*/

import { Schema, model } from "mongoose";

const equipmentAssignmentSchema = new Schema(
  {
    equipoId: {
      type: Schema.Types.ObjectId,
      ref: "Equipment",
      required: true,
    },
    placaSnapshot: { type: String, trim: true, default: "" },
    categoriaSnapshot: { type: String, trim: true, default: "" },
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
    fecha: { type: Date, default: null },
    inicio: { type: Date, required: true },
    fin: { type: Date, required: true },
    estado: {
      type: String,
      enum: ["Activa", "Liberada", "Cancelada"],
      default: "Activa",
    },
    asignadoPor: { type: String, trim: true, default: "" },
    asignadoPorId: { type: String, trim: true, default: "" },
    asignadoEn: { type: Date, default: Date.now },
    liberadoPor: { type: String, trim: true, default: "" },
    liberadoPorId: { type: String, trim: true, default: "" },
    liberadoEn: { type: Date, default: null },
    motivoLiberacion: { type: String, trim: true, default: "" },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

equipmentAssignmentSchema.index({ equipoId: 1, estado: 1, inicio: 1, fin: 1 });
equipmentAssignmentSchema.index({ origenTipo: 1, origenId: 1 });

export default model("EquipmentAssignment", equipmentAssignmentSchema);
