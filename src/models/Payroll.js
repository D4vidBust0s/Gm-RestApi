/*
  archivo que modela los tipos de datos para la personas de la nomina del canal
  por ejemplo... David Bustos del luces
*/

import { Schema, model } from "mongoose";

const payrollSchema = new Schema({
  nombres: {
    type: String,
    require: true,
  },

  apellidos: {
    type: String,
    require: true,
  },

  edad: {
    type: String,
    require: true,
  },

  fechaDeNacimiento: {
    type: Date,
    require: true,
  },

  genero: {
    type: String,
    require: true,
    trim: true,
  },

  estadoCivil: {
    type: String,
    require: true,
    trim: true,
  },

  celularPrioritario: {
    type: String,
    require: true,
    trim: true,
  },

  celularAux: {
    type: String,
    require: true,
    trim: true,
  },

  telefonoFijo: {
    type: String,
    require: true,
    trim: true,
  },

  direccionResidencia: {
    type: String,
    require: true,
  },

  email: {
    type: String,
    require: true,
    trim: true,
  },

  cc: {
    type: String,
    require: true,
    trim: true,
  },

  pasaporte: {
    type: String,
    require: false,
    trim: true,
  },

  tarjetaProfesional: {
    type: String,
    require: false,
    trim: true,
  },

  cargo: {
    type: String,
    require: true,
  },

  grupo: {
    type: String,
    require: true,
  },

  fechaIngreso: {
    type: Date,
    require: true,
  },

  RH: {
    type: String,
    require: true,
  },

  contactoPrincipal: {
    type: String,
    require: true,
  },

  contactoAux: {
    type: String,
    require: false,
  },

  activo: {
    type: Boolean,
    require: true,
  },

  mainplanner: {
    type: String,
    require: true,
  },

  subGrupo: {
    type: Number,
    require: true,
  },

},{
  versionKey:false,
  timestamps:true
});

export default model("Payroll", payrollSchema);