/*
  Adjuntos de un mantenimiento.

  Se guardan en una colección aparte para no inflar el documento Equipment.
  El archivo vive como data URL y se sirve por endpoint; el JSON del equipo
  solo expone la ruta y los metadatos.
*/

import { Schema, model } from "mongoose";

const equipmentMaintenanceAttachmentSchema = new Schema(
  {
    equipoId: {
      type: Schema.Types.ObjectId,
      ref: "Equipment",
      required: true,
      index: true,
    },
    mantenimientoId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    pasoId: {
      type: Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    nombre: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    tipo: {
      type: String,
      required: true,
      trim: true,
    },
    tamano: {
      type: Number,
      default: 0,
      min: 0,
    },
    dataUrl: {
      type: String,
      required: true,
    },
    subidoPor: { type: String, trim: true, default: "" },
    subidoPorId: { type: String, trim: true, default: "" },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

equipmentMaintenanceAttachmentSchema.index({
  equipoId: 1,
  mantenimientoId: 1,
  pasoId: 1,
  createdAt: 1,
});

export default model(
  "EquipmentMaintenanceAttachment",
  equipmentMaintenanceAttachmentSchema
);
