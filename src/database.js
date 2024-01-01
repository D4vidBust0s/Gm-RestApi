/*
   Archivo exclusivo para la conexion con la base de datos
   mongodb a travez de mongoose
*/

import mongoose from "mongoose";
import config from "./config";

(async () => {
  try {
    const db = await mongoose.connect(config.mongodbURL);
    console.log("Connected to database - ", db.connection.name);
  } catch (error) {
    console.log(error);
  }
})();
