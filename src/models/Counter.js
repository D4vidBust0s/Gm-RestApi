/*
  Secuencias internas (por ejemplo, el consecutivo anual de requerimientos).
*/

import { Schema, model } from "mongoose";

const counterSchema = new Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { versionKey: false }
);

export default model("Counter", counterSchema);
