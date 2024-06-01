/*
  archivo que modela los tipos de datos para las rules o reglas que rigen el sitema
  como por ejemplo: Dia en que empoieza la semana y horas de inicio y final
  de los turnos diurnos y nocturnos
*/

import { Schema, model } from "mongoose";

const RulesSchema = new Schema({
  InDiaDeLaSemana: {
    type: String,
    require: true,
    trim: true,
  },

  InLaboralDiurna: {
    type: Date,
    require: true,
    trim: true,
  },

  EndLaboralDiurna: {
    type: Date,
    require: true,
    trim: true,
  },

  InLaboralNocturna: {
    type: Date,
    require: true,
    trim: true,
  },

  EndLaboralNocturna: {
    type: Date,
    require: true,
    trim: true,
  },

  DiaPeriod: {
    type: Date,
    require: true,
    trim: true,
  },

  Dia: {
    type: String,
    require: true,
    trim: true,
  },
  
},{
  versionKey:false,
  timestamps:true
});

export default model("Rules", RulesSchema);