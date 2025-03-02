/*
  archivo que modela los tipos de datos para gestionar automaticamente
  la rotacion de fin de semana de cada trabajador 
*/

import { Schema, model } from "mongoose";

const rotationsManagerSchema = new Schema({
  userName: {
    type: String,
    require: true,
    trim: true,
  },

  userId: {
    type: String,
    require: true,
    trim: true,
  },

  groupName: {
    type: String,
    require: true,
    trim: true,
  },

  groupId: {
    type: String,
    require: true,
    trim: true,
  },

  SchemaName: {
    type: String,
    require: true,
    trim: false,
  },

  schemaId: {
    type: String,
    require: true,
    trim: true,
  },

  totalSchema: {
    type: Number,
    require: true,
    trim: true,
  },

  totalGrupo: {
    type: Number,
    require: true,
    trim: true,
  },

  actual: {
    type: Number,
    require: true,
    trim: true,
  },

  dayKey: {
    type: Date,
    require: true,
    trim: true,
  },

  fijo: {
    type: Boolean,
    require: true,
    trim: true,
  },
},{
  versionKey:false,
  timestamps:true
});

export default model("RotationsManagerFS", rotationsManagerSchema);