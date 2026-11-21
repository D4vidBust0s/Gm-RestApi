/**
 * Hoja de vida de un equipo.
 *
 * Es append-only: solo el backend agrega entradas. El cliente puede leerla y
 * filtrarla, pero nunca escribirla.
 */

export const crearEntradaHistorial = ({
  tipo,
  titulo = "",
  detalle = "",
  estadoAnterior = null,
  estadoNuevo = null,
  por = "Sistema",
  porId = "",
  el = new Date(),
  meta = {},
}) => ({
  tipo,
  titulo,
  detalle,
  estadoAnterior,
  estadoNuevo,
  por,
  porId,
  el,
  meta,
});

/** Agrega una entrada al documento Mongoose (sin guardar). */
export const agregarEvento = (equipo, entrada) => {
  if (!equipo) return;

  if (!Array.isArray(equipo.hojaDeVida)) equipo.hojaDeVida = [];
  equipo.hojaDeVida.push(crearEntradaHistorial(entrada));
};
