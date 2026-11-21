/*
  Mutaciones compartidas para abrir un mantenimiento sobre un documento de
  equipo. Las usan el controlador de Maintenance y la descarga de Assignments
  con novedad, para que ambas rutas dejen exactamente el mismo registro.
*/

import { agregarEvento } from "./equipmentHistory";

const texto = (valor) => String(valor ?? "").trim();

export const estadoTextoEquipo = (equipo) =>
  equipo?.estado === "Inactivo"
    ? equipo?.motivoInactivo || "Inactivo"
    : "Activo";

/**
 * Agrega el registro de mantenimiento y deja el equipo Inactivo/Mantenimiento.
 * No guarda: el llamador decide cuándo persistir (y cómo manejar adjuntos).
 *
 * @returns {object} subdocumento de mantenimiento
 */
export const crearRegistroMantenimiento = ({
  equipo,
  usuario = {},
  tipo = "Preventivo",
  descripcion = "",
  seguimiento = null,
}) => {
  if (!equipo) throw new Error("El equipo no existe");

  const anterior = estadoTextoEquipo(equipo);

  equipo.mantenimientos.push({
    tipo,
    descripcion: texto(descripcion),
    tecnico: texto(usuario.nombre),
    seguimiento,
    progreso: 0,
    pasos: [],
    iniciadoEn: new Date(),
    estado: "En proceso",
    por: texto(usuario.nombre),
    porId: texto(usuario.id),
  });

  const mantenimiento = equipo.mantenimientos[equipo.mantenimientos.length - 1];

  equipo.estado = "Inactivo";
  equipo.motivoInactivo = "Mantenimiento";
  equipo.actualizadoPor = texto(usuario.nombre);
  equipo.actualizadoPorId = texto(usuario.id);

  agregarEvento(equipo, {
    tipo: "mantenimiento_iniciado",
    titulo: `Mantenimiento ${texto(tipo).toLowerCase()} iniciado`,
    detalle: texto(descripcion),
    estadoAnterior: anterior,
    estadoNuevo: "Mantenimiento",
    por: texto(usuario.nombre),
    porId: texto(usuario.id),
    meta: {
      tecnico: texto(usuario.nombre),
      seguimiento: Boolean(seguimiento),
    },
  });

  return mantenimiento;
};

/** Seguimiento pendiente que abre la descarga de una Assignment. */
export const crearSeguimientoDescarga = (inicio = new Date()) => ({
  estado: "Pendiente",
  inicio,
  fin: null,
  nota: "",
  cerradoPor: "",
  cerradoPorId: "",
  anotaciones: [],
});
