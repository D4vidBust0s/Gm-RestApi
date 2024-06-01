/*
  archivo que modela los tipos de datos para los descansos de un trabajador
*/

import {Schema,model} from 'mongoose'

const breaksSchema = new Schema({
  Nombre:{
    type: String,
    require: true,
    trim: true
  },
  Año:{
    type: String,
    require: true,
  },
  FechaInicio:{
    type: Date,
    require: true,
  },
  FechaFinal:{
    type: Date,
    require: true,
    trim: true
  },
  Observacion:{
    type: String,
    require: true,
    trim: true
  },
  Estado:{
    type: Boolean,
    require: true,
    trim: true
  },
  NombreEmpleado:{
    type: String,
    require: true,
    trim: true
  },
  Id_Empleado:{
    type: String,
    require: true,
    trim: true
  },
},{
    versionKey:false,
    timestamps:true
});

export default model('Breaks',breaksSchema)