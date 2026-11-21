/*
  Subcategorías del inventario de GM-Activos.
  Ejemplo: Iluminación → Paneles LED, Fresneles; Cámaras → Estudio, Reportería.
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

const equipmentSubcategorySchema = new Schema(
  {
    categoriaId: {
      type: Schema.Types.ObjectId,
      ref: "EquipmentCategory",
      required: true,
    },
    nombre: {
      type: String,
      required: true,
      trim: true,
    },
    nombreClave: {
      type: String,
      required: true,
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

equipmentSubcategorySchema.index(
  { categoriaId: 1, nombreClave: 1 },
  { unique: true }
);

export default model("EquipmentSubcategory", equipmentSubcategorySchema);
