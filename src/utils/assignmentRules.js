/*
  Reglas puras de las Assignments (custodia de equipos).

  El código de aprobación es fijo y temporal mientras se construye la app
  móvil. No se lee de Rules ni de la base de datos.
*/

import { timingSafeEqual } from "node:crypto";

export const ESTADOS_CUSTODIA = [
  "Pendiente",
  "Activa",
  "Cerrada",
  "Anulada",
];

export const ESTADOS_ACTIVOS_CUSTODIA = ["Pendiente", "Activa"];

export const ESTADOS_ORIGEN_ELEGIBLE = ["Aprobada", "Agendado"];

export const CODIGO_APROBACION_TEMPORAL = "123";

export const MAX_INTENTOS_CODIGO = 5;

export const MAX_EQUIPOS_POR_CUSTODIA = 50;

// TODO(app): reemplazar por la aceptación autenticada del trabajador en la
// app móvil y eliminar este código temporal.
export const ES_VERIFICACION_TEMPORAL = true;

export const normalizarCodigo = (valor) => String(valor ?? "").trim();

/** Compara el código en tiempo constante (evita filtrar longitud por tiempo). */
export const codigoTemporalValido = (codigo) => {
  const recibido = Buffer.from(normalizarCodigo(codigo));
  const esperado = Buffer.from(CODIGO_APROBACION_TEMPORAL);

  if (recibido.length !== esperado.length) return false;

  return timingSafeEqual(recibido, esperado);
};

export const esOrigenElegible = (estado) =>
  ESTADOS_ORIGEN_ELEGIBLE.includes(String(estado ?? "").trim());

export const esEstadoCustodiaActivo = (estado) =>
  ESTADOS_ACTIVOS_CUSTODIA.includes(String(estado ?? "").trim());

export const RESULTADOS_DESCARGA = ["Sin novedad", "Con novedad"];

export const TIPOS_NOVEDAD = ["Daño", "Pérdida", "Otro"];

export const ACCIONES_NOVEDAD = ["Mantenimiento", "Caso especial"];

const texto = (valor) => String(valor ?? "").trim();

/**
 * Valida el cuerpo de la descarga contra los equipos de la custodia.
 * Devuelve { error } o { items: [{ equipoId, resultado, ... }] }.
 */
export const validarDescarga = ({
  equiposCustodia = [],
  items = [],
  revisadoFisicamente = false,
} = {}) => {
  if (revisadoFisicamente !== true) {
    return {
      error: "Debes confirmar que revisaste físicamente los equipos",
    };
  }

  if (!Array.isArray(items)) {
    return { error: "Debes indicar el resultado de cada equipo" };
  }

  const custodiaPorId = new Map(
    (Array.isArray(equiposCustodia) ? equiposCustodia : []).map((item) => [
      String(item?.equipoId ?? item?.equipoId?._id ?? ""),
      item,
    ])
  );

  if (custodiaPorId.size === 0) {
    return { error: "La Assignment no tiene equipos para descargar" };
  }

  if (items.length !== custodiaPorId.size) {
    return {
      error: "Debes registrar el resultado de todos los equipos de la Assignment",
    };
  }

  const vistos = new Set();
  const normalizados = [];

  for (const item of items) {
    const equipoId = texto(item?.equipoId);
    const original = custodiaPorId.get(equipoId);

    if (!equipoId || !original) {
      return {
        error: "La descarga incluye un equipo que no pertenece a la Assignment",
      };
    }

    if (vistos.has(equipoId)) {
      return { error: "Un equipo está repetido en la descarga" };
    }

    vistos.add(equipoId);

    const resultado = texto(item?.resultado);
    if (!RESULTADOS_DESCARGA.includes(resultado)) {
      return {
        error: "El resultado de cada equipo debe ser Sin novedad o Con novedad",
      };
    }

    if (resultado === "Sin novedad") {
      normalizados.push({
        equipoId,
        resultado,
        placa: texto(original?.placaSnapshot),
      });
      continue;
    }

    const novedadTipo = texto(item?.novedadTipo);
    if (!TIPOS_NOVEDAD.includes(novedadTipo)) {
      return {
        error: "Selecciona el tipo de novedad (Daño, Pérdida u Otro)",
      };
    }

    const novedadDescripcion = texto(item?.novedadDescripcion);
    if (!novedadDescripcion) {
      return { error: "Describe la novedad del equipo" };
    }

    const accionNovedad = texto(item?.accionNovedad);
    if (!ACCIONES_NOVEDAD.includes(accionNovedad)) {
      return {
        error:
          "Selecciona si el equipo va a Mantenimiento o a un Caso especial",
      };
    }

    normalizados.push({
      equipoId,
      resultado,
      placa: texto(original?.placaSnapshot),
      novedadTipo,
      novedadDescripcion,
      accionNovedad,
    });
  }

  return {
    items: normalizados,
    resultado: normalizados.some((item) => item.resultado === "Con novedad")
      ? "Con novedad"
      : "Sin novedad",
  };
};

/** Describe el resumen de una descarga para la novedad y la auditoría. */
export const resumenNovedades = (items = []) => {
  const conNovedad = (Array.isArray(items) ? items : []).filter(
    (item) => item.resultado === "Con novedad"
  );

  return {
    total: conNovedad.length,
    equipos: conNovedad.map((item) => ({
      placa: texto(item.placa),
      tipo: texto(item.novedadTipo),
      descripcion: texto(item.novedadDescripcion),
      accion: texto(item.accionNovedad),
    })),
  };
};

export const estadoTrasIntentoFallido = (intentos = 0) => {
  const total = Number(intentos) || 0;
  return {
    intentos: total,
    bloqueada: total >= MAX_INTENTOS_CODIGO,
    intentosRestantes: Math.max(0, MAX_INTENTOS_CODIGO - total),
  };
};
