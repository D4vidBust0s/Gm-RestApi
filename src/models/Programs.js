/*
  archivo que modela los tipos de datos para los Programas fijos del canal
  por ejemplo... arriba bogota que va de lunes a viernes de 4:30 a 9:30
*/

import { Schema, model } from "mongoose";

const programSchema = new Schema({
  nombre: {
    type: String,
    require: true,
    trim: true,
  },

  lunes: {
    type: Boolean,
    require: true,
  },

  Martes: {
    type: Boolean,
    require: true,
  },

  Miercoles: {
    type: Boolean,
    require: true,
  },

  Jueves: {
    type: Boolean,
    require: true,
  },

  Viernes: {
    type: Boolean,
    require: true,
  },

  Sabado: {
    type: Boolean,
    require: true,
  },

  Domingo: {
    type: Boolean,
    require: true,
  },

  Start: {
    type: String,
    require: true,
  },

  End: {
    type: String,
    require: true,
  },

  descripcion: {
    type: String,
    require: true,
  },

},{
  versionKey:false,
  timestamps:true
});

export default model("Programs", programSchema);
