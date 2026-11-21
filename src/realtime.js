/*
  Canal de tiempo real para novedades y cambios de usuario.

  Se guarda la instancia de Socket.IO en un módulo aparte para que los
  controladores puedan emitir sin importar app.js (lo que crearía un import
  circular: app -> routes -> controller -> app).
*/

export const RT_EVENTS = {
  CREATED: "novedad_creada",
  RESOLVED: "novedad_solucionada",
  DELETED: "novedad_eliminada",
  // Cambio de perfil (foto, nombre, rol): lo escuchan las listas de usuarios
  // como el chat, para refrescar sin recargar.
  USER_UPDATED: "usuario_actualizado",
  // Inventario de GM-Activos
  EQUIPMENT_CHANGED: "equipment:changed",
  EQUIPMENT_CATEGORIES_CHANGED: "equipment-categories:changed",
  EQUIPMENT_SUBCATEGORIES_CHANGED: "equipment-subcategories:changed",
  EQUIPMENT_LOCATIONS_CHANGED: "equipment-locations:changed",
  EQUIPMENT_ASSIGNMENT_CHANGED: "equipment-assignment:changed",
  // Requirements (sistema de solicitudes por áreas)
  REQUIREMENTS_CHANGED: "requirements:changed",
  // Assignments (custodia de equipos)
  ASSIGNMENT_CHANGED: "assignment:changed",
  EQUIPMENT_INCIDENT_CHANGED: "equipment-incident:changed",
  // Planner de turnos: lo escucha el MainPlanner de consulta de GM-Activos.
  PLANNER_CHANGED: "planner:changed",
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
