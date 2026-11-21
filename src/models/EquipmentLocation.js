/*
  Ubicaciones administrables del inventario de GM-Activos.
  Ejemplos: Bodega, Estudio 1, Estudio 3, Sede principal.
*/

import { Schema, model } from "mongoose";

const equipmentLocationSchema = new Schema(
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
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

export default model("EquipmentLocation", equipmentLocationSchema);
