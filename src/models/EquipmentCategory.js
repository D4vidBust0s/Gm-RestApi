/*
  Categorías administrables del inventario de GM-Activos.
  Ejemplos: Iluminación, Cámaras, Audio, Transmisión.
*/

import { Schema, model } from "mongoose";

const imagenSchema = new Schema(
  {
    dataUrl: { type: String, default: "" },
    tipo: { type: String, default: "" },
    nombre: { type: String, default: "" },
    actualizadaEn: { type: Date, default: Date.now },
  },
  { _id: false }
);

const equipmentCategorySchema = new Schema(
  {
    nombre: {
      type: String,
      required: true,
      trim: true,
    },
    nombreClave: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    descripcion: {
      type: String,
      trim: true,
      default: "",
    },
    orden: {
      type: Number,
      default: 0,
    },
    activo: {
      type: Boolean,
      default: true,
    },
    imagen: {
      type: imagenSchema,
      default: null,
    },
    imagenMiniatura: {
      type: imagenSchema,
      default: null,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

export default model("EquipmentCategory", equipmentCategorySchema);
