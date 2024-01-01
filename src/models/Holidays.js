/*
  archivo que modela los tipos de datos para administrar los dias festivos, considerados festivos por la empresa
  por ejemplo... Enero de 2023 (3,9,12)
*/

import { json } from "express";
import { Schema, model } from "mongoose";

const holidaySchema = new Schema({
  Nombre: {
    type: String,
    require: true,
    trim: true,
  },
  Mes: {
    type: Number,
    require: true,
    trim: true,
  },
  Año: {
    type: Number,
    require: true,
    trim: true,
  },
  Dias: {
    type: JSON,
    require: false,
    trim: true,
  },
},{
  versionKey:false,
  timestamps:true
});

export default model("Holidays", holidaySchema);
