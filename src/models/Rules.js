/*
  archivo que modela los tipos de datos para las rules o reglas que rigen el sitema
  como por ejemplo: Dia en que empieza la semana y horas de inicio y final
  de los turnos diurnos y nocturnos
*/

import { Schema, model } from "mongoose";

const RulesSchema = new Schema({
  InDiaDeLaSemana: {
    type: String,
    required: true,
    trim: true,
  },

  InLaboralDiurna: {
    type: Date,
    required: true,
    trim: true,
  },

  EndLaboralDiurna: {
    type: Date,
    required: true,
    trim: true,
  },

  InLaboralNocturna: {
    type: Date,
    required: true,
    trim: true,
  },

  EndLaboralNocturna: {
    type: Date,
    required: true,
    trim: true,
  },

  DiaPeriod: {
    type: Date,
    required: true,
    trim: true,
  },

  Dia: {
    type: String,
    required: true,
    trim: true,
  },

  Horas: {
    type: String,
    required: true,
    trim: true,
  },

  IntensidadHorariaDiaria: {
    type: String,
    required: true,
    trim: true,
  },
  
  DiasAlert: {
    type: String,
    required: true,
    trim: true,
  },

  DiasPeriodo: {
    type: String,
    required: true,
    trim: true,
  },
  
},{
  versionKey: false,
  timestamps: true
});

export default model("Rules", RulesSchema);