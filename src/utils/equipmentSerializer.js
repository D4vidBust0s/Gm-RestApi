/**
 * Convierte documentos Mongoose de equipos en el contrato que consumen
 * GM-Activos, Programmer y Requirements. No expone data URLs gigantes: las
 * imágenes se sirven por endpoint y el JSON solo lleva las rutas.
 */

import { descripcionEquipo, estadoVisible } from "./equipmentRules";
import { metadataImagenEquipo } from "./equipmentImages";
import { calcularProgreso, mapearSeguimiento } from "./equipmentMaintenance";

const texto = (valor) => String(valor ?? "").trim();

const idDe = (valor) => {
  if (!valor) return "";
  if (typeof valor === "object") return String(valor._id ?? valor.id ?? "");
  return String(valor);
};

const nombreDe = (valor, campo = "nombre") => {
  if (!valor) return "";
  if (typeof valor === "object") return texto(valor[campo] ?? valor.nombre);
  return texto(valor);
};

const mapearObservacion = (item) => ({
  id: String(item?._id ?? item?.id ?? ""),
  texto: texto(item?.texto),
  por: texto(item?.por),
  porId: texto(item?.porId),
  creadoEn: item?.creadoEn ?? null,
  editadoEn: item?.editadoEn ?? null,
});

const mapearRestriccion = (item) => ({
  id: String(item?._id ?? item?.id ?? ""),
  texto: texto(item?.texto),
  por: texto(item?.por),
  porId: texto(item?.porId),
  creadoEn: item?.creadoEn ?? null,
});

const mapearMantenimiento = (item, adjuntos = [], adjuntosPorPaso = {}) => ({
  id: String(item?._id ?? item?.id ?? ""),
  tipo: texto(item?.tipo),
  descripcion: texto(item?.descripcion),
  tecnico: texto(item?.tecnico),
  iniciadoEn: item?.iniciadoEn ?? null,
  finalizadoEn: item?.finalizadoEn ?? null,
  estado: texto(item?.estado),
  resultado: item?.resultado ?? null,
  // Se recalcula al leer para que los mantenimientos anteriores a `avance`
  // también reflejen el progreso de sus pasos sin esperar a una escritura.
  progreso: calcularProgreso({
    estado: texto(item?.estado),
    pasos: Array.isArray(item?.pasos) ? item.pasos : [],
  }),
  pasos: (Array.isArray(item?.pasos) ? item.pasos : []).map((paso) => {
    const pasoId = String(paso?._id ?? paso?.id ?? "");

    return {
      id: pasoId,
      texto: texto(paso?.texto),
      avance: paso?.avance ?? null,
      por: texto(paso?.por),
      porId: texto(paso?.porId),
      creadoEn: paso?.creadoEn ?? null,
      adjuntos: adjuntosPorPaso[pasoId] ?? [],
    };
  }),
  seguimiento: mapearSeguimiento(item),
  adjuntos: Array.isArray(adjuntos) ? adjuntos : [],
  iniciadoPor: texto(item?.por),
  finalizadoPor: texto(item?.finalizadoPor),
  finalizadoPorId: texto(item?.finalizadoPorId),
  por: texto(item?.por),
  porId: texto(item?.porId),
});

const mapearHistorial = (item) => ({
  id: String(item?._id ?? item?.id ?? ""),
  tipo: texto(item?.tipo),
  titulo: texto(item?.titulo),
  detalle: texto(item?.detalle),
  estadoAnterior: item?.estadoAnterior ?? null,
  estadoNuevo: item?.estadoNuevo ?? null,
  por: texto(item?.por),
  porId: texto(item?.porId),
  el: item?.el ?? null,
  meta: item?.meta ?? {},
});

const mapearReserva = (item) => ({
  id: String(item?._id ?? item?.id ?? ""),
  equipoId: idDe(item?.equipoId),
  origenTipo: texto(item?.origenTipo),
  origenId: idDe(item?.origenId),
  origenCodigo: texto(item?.origenCodigo),
  origenNombre: texto(item?.origenNombre),
  fecha: item?.fecha ?? null,
  inicio: item?.inicio ?? null,
  fin: item?.fin ?? null,
  estado: texto(item?.estado),
});

/**
 * @param {object} equipo documento (idealmente con categoriaId y ubicacionId populados)
 * @param {object} opciones { reservas, incluirHistorial, incluirMantenimientos, adjuntosPorMantenimiento, adjuntosPorPaso }
 */
export const serializarEquipo = (
  equipo,
  {
    reservas = [],
    custodia = null,
    incluirHistorial = false,
    incluirMantenimientos = true,
    adjuntosPorMantenimiento = {},
    adjuntosPorPaso = {},
  } = {}
) => {
  if (!equipo) return null;

  const id = idDe(equipo);
  const ahora = new Date();
  const activas = (Array.isArray(reservas) ? reservas : [])
    .filter((reserva) => reserva?.estado === "Activa")
    .sort((a, b) => new Date(a.inicio) - new Date(b.inicio));

  const tieneReservaVigente = activas.some(
    (reserva) => new Date(reserva.fin).getTime() >= ahora.getTime()
  );
  const asignadoAhora = activas.some(
    (reserva) =>
      new Date(reserva.inicio).getTime() <= ahora.getTime() &&
      new Date(reserva.fin).getTime() > ahora.getTime()
  );
  const tieneCustodiaActiva = Boolean(custodia);
  const estadoOperativo = estadoVisible({
    estado: texto(equipo?.estado),
    motivoInactivo: equipo?.motivoInactivo,
    tieneReservaVigente,
    tieneCustodiaActiva,
  });

  const imagen = metadataImagenEquipo(equipo);
  const mantenimientoEnProceso =
    (Array.isArray(equipo?.mantenimientos) ? equipo.mantenimientos : [])
      .filter((item) => item?.estado === "En proceso")
      .sort(
        (a, b) => new Date(b.iniciadoEn || 0) - new Date(a.iniciadoEn || 0)
      )[0] ?? null;

  return {
    id,
    placa: texto(equipo?.placa),
    categoria: {
      id: idDe(equipo?.categoriaId),
      nombre: nombreDe(equipo?.categoriaId),
    },
    subcategoria: {
      id: idDe(equipo?.subcategoriaId),
      nombre: nombreDe(equipo?.subcategoriaId),
    },
    ubicacion: {
      id: idDe(equipo?.ubicacionId),
      nombre: nombreDe(equipo?.ubicacionId),
    },
    descripcion: descripcionEquipo(equipo),
    estado: texto(equipo?.estado),
    estadoBase: texto(equipo?.estado),
    motivoInactivo: equipo?.motivoInactivo ?? null,
    estadoOperativo,
    subEstado: estadoOperativo,
    enCustodia: tieneCustodiaActiva,
    custodia: tieneCustodiaActiva
      ? {
          id: String(custodia._id ?? custodia.id ?? ""),
          codigo: texto(custodia.codigo),
          estado: texto(custodia.estado),
          trabajadorId: texto(custodia.trabajadorId),
          trabajadorNombre: texto(custodia.trabajadorNombre),
          desde: custodia.creadaEn ?? custodia.createdAt ?? null,
        }
      : null,
    imagen,
    observaciones: (Array.isArray(equipo?.observaciones) ? equipo.observaciones : []).map(
      mapearObservacion
    ),
    restricciones: (Array.isArray(equipo?.restricciones) ? equipo.restricciones : []).map(
      mapearRestriccion
    ),
    progresoMantenimiento: mantenimientoEnProceso
      ? calcularProgreso({
          estado: texto(mantenimientoEnProceso.estado),
          pasos: Array.isArray(mantenimientoEnProceso.pasos)
            ? mantenimientoEnProceso.pasos
            : [],
        })
      : null,
    mantenimientos: incluirMantenimientos
      ? (Array.isArray(equipo?.mantenimientos) ? equipo.mantenimientos : []).map(
          (item) =>
            mapearMantenimiento(
              item,
              adjuntosPorMantenimiento[String(item?._id ?? item?.id ?? "")] ?? [],
              adjuntosPorPaso
            )
        )
      : undefined,
    hojaDeVida: incluirHistorial
      ? (Array.isArray(equipo?.hojaDeVida) ? equipo.hojaDeVida : [])
          .slice()
          .sort((a, b) => new Date(a.el) - new Date(b.el))
          .map(mapearHistorial)
      : undefined,
    reservasActivas: activas.map(mapearReserva),
    asignadoAhora: asignadoAhora || tieneCustodiaActiva,
    proximaReserva:
      activas.find(
        (reserva) => new Date(reserva.fin).getTime() >= ahora.getTime()
      ) ?? null,
    creadoPor: texto(equipo?.creadoPor),
    actualizadoPor: texto(equipo?.actualizadoPor),
    createdAt: equipo?.createdAt ?? null,
    updatedAt: equipo?.updatedAt ?? null,
  };
};

export const serializarReserva = mapearReserva;
