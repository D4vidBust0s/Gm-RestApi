/*
  archivo que modela los tipos de datos para los turnos
*/

import {Schema,model} from 'mongoose';

const shiftsSchema = new Schema({
  ID_User:{
    type: String,
    require: true,
    trim: true
  },
  NombreUser:{
    type: String,
    require: true,
  },
  SubGrupo:{
    type: Number,
    require: true,
  },
  FechaActiva:{
    type: Date,
    require: true,
    trim: true
  },
  Start:{
    type: Date,
    require: true,
    trim: true
  },
  End:{
    type: Date,
    require: true,
    trim: true
  },
  Evento:{
    type: String,
    require: true
  },
  Color:{
    type: String,
    require: true,
    trim: true
  },
  Tipo:{
    type: String,
    require: true,
    trim: true
  },
  Observacion:{
    type: String,
    require: false,
  },
},{
    versionKey:false,
    timestamps:true
});

export default model('Shifts',shiftsSchema)