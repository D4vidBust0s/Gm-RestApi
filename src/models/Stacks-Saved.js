/*
  archivo que modela los tipos de datos para los esquemas de stack que se almacenaran para ser posteriormente llamados
  por ejemplo... Stack Arriba Bogota (Montaje - Aiiba Bogota - null 30 - null 30 - Avance y Montaje - Citynoticias de las 12)
*/

import { json } from "express";
import { Schema, model } from "mongoose";

const holidaySchema = new Schema({
  NameStack: {
    type: String,
    require: true,
    trim: true,
  },
  Stack: {
    type: JSON,
    require: true,
    trim: true,
  },
},{
  versionKey:false,
  timestamps:true
});

export default model("Stack-Saved", holidaySchema);
