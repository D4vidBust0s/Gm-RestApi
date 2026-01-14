/*
  archivo que modela los tipos de datos para savedStacks
*/

import {Schema,model} from 'mongoose';

const shiftsSavedSchema = new Schema({
Nombre_Stack: {
    type: String,
    require: true,
    trim: true,
  },
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
  Index: {
    type: Number,
    require: true,
    trim: true,
  },
  Event_name: {
    type: String,
    require: true,
    trim: true,
  },
  ID_event: {
    type: String,
    require: true,
    trim: true,
  },
  Color: {
    type: String,
    require: false,
    trim: true,
  },
  Observacion: {
    type: String,
    require: false,
    trim: true,
  },
  Fecha_clave: {
    type: Date,
    require: false,
    trim: true,
  },
  Id_Schema: {
    type: String,
    require: false,
    trim: true,
  },
  Inicio_main: {
    type: String,
    require: false,
    trim: true,
  },
  Out: {
    type: String,
    require: false,
    trim: true,
  },
  Type: {
    type: String,
    require: false,
    trim: true,
  },
},{
    versionKey:false,
    timestamps:true
});

export default model('SavedStack',shiftsSavedSchema)