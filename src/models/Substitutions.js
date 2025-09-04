/*
  archivo que modela los tipos de datos para las Sustituciones temporales del sistema
*/

import {Schema,model} from 'mongoose';

const substitutionsSchema = new Schema({
  ID_user_main: {
    type: String,
    require: true,
    trim: true,
  },
  ID_user_sustituto: {
    type: String,
    require: false,
    trim: true,
  },
  NombreLeft: {
    type: String,
    require: true,
    trim: true,
  },
  NombreRight: {
    type: String,
    require: true,
    trim: true,
  },
  ID_grupo_iz: {
    type: String,
    require: true,
    trim: true,
  },
  ID_grupo_der: {
    type: String,
    require: true,
    trim: true,
  },
  Fecha_dia: {
    type: Date,
    require: false,
    trim: true,
  },
  Operacion: {
    type: Number,
    require: false,
    trim: true,
  },
 
},{
    versionKey:false,
    timestamps:true
});

export default model('substitutions',substitutionsSchema)