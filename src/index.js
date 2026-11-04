/* 
  Se inicializa o arranca el servidor
  con express y socket.io utilizando httpServer
*/

import app, { httpServer } from "./app";
import "./database";

const PORT = app.get("port");

// Arrancamos el servidor HTTP compartido (Express + Socket.io)
httpServer.listen(PORT, () => {
  console.log("Server and WebSockets on port", PORT);
});