import { Schema, model } from "mongoose";

const messageSchema = new Schema(
  {
    remitente: {
      type: Schema.Types.ObjectId,
      ref: "User", // Ajusta el nombre de tu modelo de usuario si es diferente
      required: true,
    },
    destinatario: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null, // Si es null, significa que es un mensaje para el Chat General Corporativo
    },
    texto: {
      type: String,
      required: true,
      trim: true,
    },
    archivoUrl: {
      type: String,
      default: "", // Para almacenar la ruta o URL de imágenes o archivos adjuntos
    },
    leido: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // Esto crea automáticamente 'createdAt' y 'updatedAt'
    versionKey: false,
  }
);

export default model("Message", messageSchema);