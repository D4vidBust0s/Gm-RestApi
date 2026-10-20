import { Schema, model } from "mongoose";

const taskSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    titulo: { type: String, required: true },
    descripcion: { type: String, default: "" },
    prioridad: { type: String, enum: ["Alta", "Media", "Baja"], default: "Media" },
    categoria: { type: String, default: "General" },
    completada: { type: Boolean, default: false },
    fechaVencimiento: { type: Date }
  },
  { timestamps: true }
);

export default model("Task", taskSchema);