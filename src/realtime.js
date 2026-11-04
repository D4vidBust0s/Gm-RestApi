/*
  Canal de tiempo real para novedades.

  Se guarda la instancia de Socket.IO en un módulo aparte para que los
  controladores puedan emitir sin importar app.js (lo que crearía un import
  circular: app -> routes -> controller -> app).
*/

export const RT_EVENTS = {
  CREATED: "novedad_creada",
  RESOLVED: "novedad_solucionada",
  DELETED: "novedad_eliminada",
};

let ioInstance = null;

/** Registra la instancia de Socket.IO creada en app.js. */
export const registerRealtime = (io) => {
  ioInstance = io;
  return io;
};

/** Emite un evento a todos los clientes conectados (si el socket ya existe). */
export const broadcast = (event, payload) => {
  if (!ioInstance) return;

  try {
    ioInstance.emit(event, payload);
  } catch (error) {
    console.error(`Error emitiendo el evento ${event}:`, error);
  }
};
