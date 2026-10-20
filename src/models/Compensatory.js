/*
  archivo que modela los tipos de datos para los compensatorios registrados de un trabajador
*/

import {Schema, model} from 'mongoose'

const compensatorySchema = new Schema({
  Nombre:{
    type: String,
    required: true,
    trim: true
  },
  Año:{
    type: String,
    required: true,
  },
  FechaInicio:{
    type: Date,
    required: true,
  },
  FechaFinal:{
    type: Date,
    required: true,
    trim: true
  },
  Observacion:{
    type: String,
    required: true,
    trim: true
  },
  Estado:{
    type: Boolean,
    required: true,
    trim: true
  },
  NombreEmpleado:{
    type: String,
    required: true,
    trim: true
  },
  Id_Empleado:{
    type: String,
    required: true,
    trim: true
  },
},{
    versionKey:false,
    timestamps:true
});

export default model('Compensatory', compensatorySchema);