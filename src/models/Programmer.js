/*
  archivo que modela los tipos de datos del programmador
*/

import {Schema,model} from 'mongoose';

const programmerSchema = new Schema({

  Nombre: {
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
  Fecha_start: {
    type: Date,
    require: false,
    trim: true,
  },
  Fecha_end: {
    type: Date,
    require: false,
    trim: true,
  },
  Time_in: {
    type: Date,
    require: false,
    trim: true,
  },
  Time_out: {
    type: Date,
    require: false,
    trim: true,
  },
  Color: {
    type: String,
    require: false,
    trim: true,
  },
  
},{
    versionKey:false,
    timestamps:true
});

export default model('Programmer',programmerSchema)