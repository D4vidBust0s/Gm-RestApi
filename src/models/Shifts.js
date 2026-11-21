/*
  archivo que modela los tipos de datos para los turnos
*/

import {Schema,model} from 'mongoose';

const shiftsSchema = new Schema({
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
  /* Origen del turno: "programmer-directo" cuando se crea desde Programmer. */
  Origen: {
    type: String,
    require: false,
    trim: true,
    default: "",
  },
  /* Consolidación: estado, auditoría y snapshot de horas para nómina. */
  EstadoConsolidacion: {
    type: String,
    enum: ["Pendiente", "Validado", "Ajustado", "NoLaborado"],
    default: "Pendiente",
  },
  ObservacionConsolidacion: {
    type: String,
    default: "",
    trim: true,
  },
  Consolidado: {
    type: Boolean,
    default: false,
  },
  ConsolidadoPor: {
    type: String,
    default: "",
    trim: true,
  },
  ConsolidadoPorId: {
    type: String,
    default: "",
    trim: true,
  },
  ConsolidadoEn: {
    type: Date,
    default: null,
  },
  MinutosConsolidados: {
    type: Number,
    default: null,
  },
},{
    versionKey:false,
    timestamps:true
});

export default model('Shifts',shiftsSchema)