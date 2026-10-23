import { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    nombres: { type: String, required: true },
    apellidos: { type: String, required: true },
    usuario: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    rol: { type: String, default: "Administrador" },
    activo: { type: Boolean, default: true },
    imagen: { type: String, default: "" }, // Campo agregado para la imagen en Base64
  },
  {
    timestamps: true,
  }
);

export default model("User", userSchema);