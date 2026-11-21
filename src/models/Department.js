/*
  Departamentos usados por Requirements y por la captura manual de Programmer.
  Antes vivían solo en el estado local del frontend.
*/

import { Schema, model } from "mongoose";

const departmentSchema = new Schema(
  {
    nombre: {
      type: String,
      required: true,
      trim: true,
      unique: true,
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

export default model("Department", departmentSchema);
