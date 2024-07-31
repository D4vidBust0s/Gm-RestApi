/*
  archivo que modela los tipos de datos para el balancer
*/

import {Schema,model} from 'mongoose'

const balancerSchema = new Schema({
 
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

  idUser:{
    type: String,
    require: true, 
    trim: true
  },

  DATA:{
    type: JSON,
    require: false,   // Aqui iria { fecha: 20/18/2024, valor: 8 }
    trim: true
  },
 
},{
    versionKey:false,
    timestamps:true
});

export default model('Balancer',balancerSchema)