/*
  archivo que modela los tipos de datos del programmador
  y los metadatos del requerimiento manual que lo origina.
*/

import { Schema, model } from 'mongoose';

const solicitanteSchema = new Schema(
  {
    Nombre: {
      type: String,
      trim: true,
    },
    Cargo: {
      type: String,
      trim: true,
    },
    Correo: {
      type: String,
      trim: true,
    },
    Telefono: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const personalSchema = new Schema(
  {
    RolId: {
      type: String,
      trim: true,
    },
    Rol: {
      type: String,
      trim: true,
    },
    Cantidad: {
      type: Number,
      default: 0,
    },
    Horas: {
      type: Number,
      default: 0,
    },
    Notas: {
      type: String,
      trim: true,
      default: "",
    },
    Asignados: {
      type: [
        new Schema(
          {
            Id: { type: String, trim: true },
            Nombre: { type: String, trim: true },
            Cargo: { type: String, trim: true },
            GrupoId: { type: String, trim: true },
            AsignadoEl: { type: Date },
            AsignadoPor: { type: String, trim: true },
            AsignadoPorId: { type: String, trim: true },
            Origen: { type: String, trim: true, default: "" },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  { _id: false }
);

const equipoSchema = new Schema(
  {
    EquipoId: {
      type: String,
      trim: true,
    },
    InventarioId: {
      type: String,
      trim: true,
    },
    Equipo: {
      type: String,
      trim: true,
    },
    Placa: {
      type: String,
      trim: true,
    },
    Descripcion: {
      type: String,
      trim: true,
    },
    ImagenActualizadaEn: {
      type: Date,
    },
    Categoria: {
      type: String,
      trim: true,
    },
    Subcategoria: {
      type: String,
      trim: true,
    },
    Cantidad: {
      type: Number,
      default: 0,
    },
    Notas: {
      type: String,
      trim: true,
      default: "",
    },
    Restricciones: {
      type: [String],
      default: [],
    },
    RestriccionesAceptadasPor: {
      type: String,
      trim: true,
      default: "",
    },
    RestriccionesAceptadasPorId: {
      type: String,
      trim: true,
      default: "",
    },
    RestriccionesAceptadasEl: {
      type: Date,
    },
  },
  { _id: false }
);

const historialSchema = new Schema(
  {
    Tipo: {
      type: String,
      trim: true,
    },
    EstadoAnterior: {
      type: String,
      trim: true,
    },
    EstadoNuevo: {
      type: String,
      trim: true,
    },
    Por: {
      type: String,
      trim: true,
    },
    PorId: {
      type: String,
      trim: true,
    },
    El: {
      type: Date,
    },
    Nota: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

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

  // Metadatos del requerimiento manual. Son opcionales para no romper los
  // registros que ya existen ni los consumidores actuales de /programmer.
  Codigo: {
    type: String,
    trim: true,
    unique: true,
    sparse: true,
  },
  Departamento: {
    type: String,
    trim: true,
  },
  Prioridad: {
    type: String,
    trim: true,
  },
  Estado: {
    type: String,
    trim: true,
  },
  TipoEvento: {
    type: String,
    trim: true,
  },
  Programa: {
    type: String,
    trim: true,
  },
  Locacion: {
    type: String,
    trim: true,
  },
  Descripcion: {
    type: String,
    trim: true,
  },
  Solicitante: {
    type: solicitanteSchema,
  },
  Personal: {
    type: [personalSchema],
    default: [],
  },
  Equipos: {
    type: [equipoSchema],
    default: [],
  },
  Historial: {
    type: [historialSchema],
    default: [],
  },
  Revision: {
    type: Number,
    default: 0,
  },
  CreadoPor: {
    type: String,
    trim: true,
  },
  CreadoPorId: {
    type: String,
    trim: true,
  },
  ActualizadoPor: {
    type: String,
    trim: true,
  },
  ActualizadoPorId: {
    type: String,
    trim: true,
  },
  DecididoPor: {
    type: String,
    trim: true,
  },
  DecididoPorId: {
    type: String,
    trim: true,
  },
  DecididoEn: {
    type: Date,
  },
  MotivoDecision: {
    type: String,
    trim: true,
  },
  
},{
    versionKey:false,
    timestamps:true
});

export default model('Programmer',programmerSchema)
