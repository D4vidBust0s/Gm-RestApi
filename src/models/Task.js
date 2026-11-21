import { Schema, model } from "mongoose";

const HORA_RECORDATORIO = /^([01]\d|2[0-3]):[0-5]\d$/;

const taskSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    titulo: { type: String, required: true },
    descripcion: { type: String, default: "" },
    prioridad: { type: String, enum: ["Alta", "Media", "Baja"], default: "Media" },
    categoria: { type: String, default: "General" },
    completada: { type: Boolean, default: false },
    fechaVencimiento: { type: Date },
    esRecordatorio: { type: Boolean, default: false },
    recordatorioDias: {
      type: [{ type: Number, min: 0, max: 6 }],
      default: []
    },
    recordatorioHoras: {
      type: [String],
      default: [],
      validate: {
        validator: (horas) => horas.every((hora) => HORA_RECORDATORIO.test(hora)),
        message: "Las horas del recordatorio deben tener formato HH:mm"
      }
    },
    // Imagenes o documentos de la nota, guardados como data URL (mismo patron
    // que los adjuntos del chat). Se limitan en el controlador.
    adjuntos: {
      type: [
        {
          nombre: { type: String, default: "" },
          tipo: { type: String, default: "" },
          url: { type: String, default: "" },
          tamano: { type: Number, default: 0 }
        }
      ],
      default: []
    }
  },
  { timestamps: true }
);

export default model("Task", taskSchema);