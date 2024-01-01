/*
  archivo que modela los tipos de datos para los grupos de trabajo del canal
  por ejemplo... luces sonido camarografos etc
*/

import { Schema, model } from "mongoose";

const groupSchema = new Schema({
  nombre: {
    type: String,
    require: true,
    trim: true,
  },

  logo: {
    type: String,
    require: true,
    trim: true,
  },

  descripcion: {
    type: String,
    require: true,
  },
},{
  versionKey:false,
  timestamps:true
});

export default model("Groups", groupSchema);
