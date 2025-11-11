/*
  archivo que modela los tipos de datos para las anotaciones diarias
*/

import {Schema,model} from 'mongoose';

const NotationsSchema = new Schema({
  ID_user: {
    type: String,
    require: true,
    trim: true,
  },
  Nombres: {
    type: String,
    require: false,
    trim: true,
  },
  Estado: {
    type: Boolean,
    require: true,
    trim: true,
  },
  Contenido: {
    type: String,
    require: false,
    trim: true,
  },
  Fecha_clave: {
    type: Date,
    require: false,
    trim: true,
  },
},{
    versionKey:false,
    timestamps:true
});

export default model('Notations',NotationsSchema)