/*
  archivo que modela los tipos de datos para administrar las rotaciones semanales de los grupos, por ejemplo semana 1 arribabogota y noticias de 5:30 am a 13:00 pm
*/

import { json } from "express";
import { Schema, model } from "mongoose";

const rotationsSchema = new Schema({
  Nombre: {
    type: String,
    require: true,
    trim: true,
  },
  HoraInicio: {
    type: Date,
    require: true,
    trim: true,
  },
  HoraFinal: {
    type: Date,
    require: true,
    trim: true,
  },
  Grupo_ID: {
    type: String,
    require: false,
    trim: true,
  },
  Tipo: {
    type: String,
    require: false,
    trim: true,
  },
  Order: {
    type: Number,
    require: false,
    trim: true,
  },
  Excluir: {
    type: Boolean,
    require: false,
    trim: true,
  },
  Descanso: {
    type: Boolean,
    require: false,
    trim: true,
  },
},{
  versionKey:false,
  timestamps:true
});

export default model("Rotations", rotationsSchema);
