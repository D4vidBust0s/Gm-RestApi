/* 
  Se inicializa o arranca el servidor
  con express, al igual que invocamos la conexion a la base de datos
*/

import app from "./app";
import "./database";

//Configuracion basica
app.listen(app.get("port"));
console.log("Server on port", app.get("port"));
