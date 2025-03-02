/*
  archivo que modela los tipos de datos para administrar los Stacks que se definen en rotations, un stack 
  tiene el orden en que se presentara cada esquema (es decir como si fuera en la hoja de excel, el turno de un trabajador en cada fila)
*/

import { json } from "express";
import { Schema, model } from "mongoose";

const stacksSchema = new Schema({
  ID_esquema: {
    type: String,
    require: true,
    trim: true,
  },
  Type: {
    type: String,
    require: true,
    trim: true,
  },
  Order: {
    type: Number,
    require: true,
    trim: true,
  },
  ID_programa: {
    type: String,
    require: true,
    trim: true,
  },
  Value: {
    type: Number,
    require: false,
    trim: true,
  },
  Duration: {
    type: Number,
    require: false,
    trim: true,
  },
},{
  versionKey:false,
  timestamps:true
});

export default model("Stacks", stacksSchema);
