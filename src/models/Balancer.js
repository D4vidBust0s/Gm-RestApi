/*
  archivo que modela los tipos de datos para el balancer
*/

import {Schema,model} from 'mongoose'

const balancerSchema = new Schema({
  Id_Empleado:{
    type: String,
    require: true,
    trim: true
  },
  NombreEmpleado:{
    type: String,
    require: true,
  },
  GrupoEmpleado:{
    type: String,
    require: true,
  },
  From:{
    type: Date,
    require: true,
    trim: true
  },
  To:{
    type: Date,
    require: true,
    trim: true
  },
  Days:{
    type: JSON,
    require: false,
    trim: true
  },
  Total:{
    type: String,
    require: true,
    trim: true
  },
 
},{
    versionKey:false,
    timestamps:true
});

export default model('Balancer',balancerSchema)