/*
  Aviso de tiempo real para el MainPlanner de GM-Activos.

  GM-Activos consulta el planner por HTTP y vuelve a leerlo al recibir
  "planner:changed". Se emite desde cada escritura que puede cambiar lo que
  muestra la pantalla: turnos, consolidaciones, ausencias, sustituciones,
  personal, grupos y programas.

  El evento no transporta el planner completo: solo indica qué colección cambió
  para que el cliente haga una única consulta agrupada.
*/

import { RT_EVENTS, broadcast } from "../realtime";

const aIso = (valor) => {
  if (!valor) return undefined;

  const fecha = valor instanceof Date ? valor : new Date(valor);

  return Number.isNaN(fecha.getTime()) ? String(valor) : fecha.toISOString();
};

/**
 * Anuncia un cambio que afecta al planner.
 *
 * @param {string} fuente Colección o proceso que cambió ("shifts",
 *   "permissions", "payroll", ...). Sirve para depurar en el cliente.
 * @param {object} datos  Campos opcionales: `action` ("created", "updated",
 *   "deleted", "bulk"), `id` del registro y `fechaClave`/`daykey` del día.
 */
export const anunciarCambioPlanner = (fuente, datos = {}) => {
  const payload = {
    source: fuente,
    action: datos.action || "changed",
    at: new Date().toISOString(),
  };

  if (datos.id) payload.id = String(datos.id);

  const fecha = aIso(datos.fechaClave ?? datos.daykey);
  if (fecha) payload.fechaClave = fecha;

  broadcast(RT_EVENTS.PLANNER_CHANGED, payload);

  return payload;
};
