/*
  Reglas y serialización de los adjuntos y del seguimiento de mantenimiento.
*/

export const MAX_ADJUNTOS = 5;
export const MAX_BYTES = 4 * 1024 * 1024; // 4 MB por archivo

export const TIPOS_PERMITIDOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/x-zip-compressed",
];

const DATA_URL = /^data:([a-z0-9.+-]+\/[a-z0-9.+-]+);base64,([a-z0-9+/=\s]+)$/i;

const texto = (valor) => String(valor ?? "").trim();

const nombreSeguro = (nombre, tipo) => {
  const limpio = texto(nombre)
    .replace(/[\\/:*?"<>|]/g, "-")
    .slice(0, 180);

  if (limpio) return limpio;

  return String(tipo ?? "").startsWith("image/") ? "imagen" : "documento";
};

const interpretarDataUrl = (valor) => {
  const dataUrl = texto(valor);
  const match = DATA_URL.exec(dataUrl);
  if (!match) return null;

  const tipo = String(match[1]).toLowerCase();
  const base64 = match[2].replace(/\s/g, "");

  if (!base64 || base64.length % 4 !== 0) return null;

  try {
    const tamano = Buffer.from(base64, "base64").length;
    return { dataUrl, tipo, tamano };
  } catch {
    return null;
  }
};

/**
 * Valida y normaliza un adjunto recibido desde la API.
 * Devuelve { adjunto } o { error }.
 */
export const normalizarAdjunto = (item) => {
  if (!item || typeof item !== "object") {
    return { error: "Adjunto no válido" };
  }

  const interpretado = interpretarDataUrl(item.url ?? item.dataUrl);
  if (!interpretado) {
    return { error: "El adjunto no contiene un archivo válido" };
  }

  if (!TIPOS_PERMITIDOS.includes(interpretado.tipo)) {
    return { error: "El tipo de archivo no está permitido" };
  }

  if (interpretado.tamano > MAX_BYTES) {
    return { error: "El archivo supera los 4 MB" };
  }

  return {
    adjunto: {
      nombre: nombreSeguro(item.nombre, interpretado.tipo),
      tipo: interpretado.tipo,
      tamano: interpretado.tamano,
      dataUrl: interpretado.dataUrl,
    },
  };
};

/**
 * Valida una lista completa. Devuelve { adjuntos } o { error }.
 */
export const normalizarAdjuntos = (lista) => {
  if (!Array.isArray(lista)) {
    return { adjuntos: [] };
  }

  if (lista.length > MAX_ADJUNTOS) {
    return { error: `Máximo ${MAX_ADJUNTOS} adjuntos por mantenimiento` };
  }

  const adjuntos = [];

  for (const item of lista) {
    const resultado = normalizarAdjunto(item);
    if (resultado.error) return { error: resultado.error };
    adjuntos.push(resultado.adjunto);
  }

  return { adjuntos };
};

export const serializarAdjunto = (adjunto, equipoId) => {
  if (!adjunto) return null;

  const id = String(adjunto._id ?? adjunto.id ?? "");
  const mantenimientoId = String(
    adjunto.mantenimientoId?._id ?? adjunto.mantenimientoId ?? ""
  );
  const pasoId = String(adjunto.pasoId?._id ?? adjunto.pasoId ?? "");

  return {
    id,
    pasoId: pasoId || null,
    nombre: texto(adjunto.nombre),
    tipo: texto(adjunto.tipo),
    tamano: Number(adjunto.tamano) || 0,
    url: `/equipment/${equipoId}/mantenimientos/${mantenimientoId}/adjuntos/${id}/archivo`,
    creadoEn: adjunto.createdAt ?? null,
    subidoPor: texto(adjunto.subidoPor),
  };
};

export const mapearSeguimiento = (item) => {
  const seguimiento = item?.seguimiento;
  if (!seguimiento || !seguimiento.estado) return null;

  return {
    estado: texto(seguimiento.estado),
    inicio: seguimiento.inicio ?? null,
    fin: seguimiento.fin ?? null,
    nota: texto(seguimiento.nota),
    cerradoPor: texto(seguimiento.cerradoPor),
    anotaciones: (Array.isArray(seguimiento.anotaciones)
      ? seguimiento.anotaciones
      : []
    ).map((anotacion) => ({
      id: String(anotacion?._id ?? anotacion?.id ?? ""),
      texto: texto(anotacion?.texto),
      por: texto(anotacion?.por),
      porId: texto(anotacion?.porId),
      creadoEn: anotacion?.creadoEn ?? null,
    })),
  };
};

export const estaPendiente = (mantenimiento) =>
  mantenimiento?.seguimiento?.estado === "Pendiente";

/**
 * Valida el avance acumulado de un paso (0-100). Devuelve { valor } o { error }.
 */
export const normalizarAvance = (valor) => {
  if (valor === null || valor === undefined || valor === "") {
    return { error: "Indica el avance del paso entre 0 y 100" };
  }

  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero < 0 || numero > 100) {
    return { error: "El avance debe estar entre 0 y 100" };
  }

  return { valor: Math.round(numero) };
};

/**
 * Progreso del mantenimiento: avance acumulado del último paso que lo tenga.
 * 100% al finalizar. Los pasos anteriores a esta función (sin `avance`)
 * conservan el cálculo legado de 10% por paso, con tope de 95%.
 */
export const calcularProgreso = ({ estado, pasos = [] }) => {
  if (estado === "Finalizado") return 100;

  const lista = Array.isArray(pasos) ? pasos : [];

  for (let i = lista.length - 1; i >= 0; i -= 1) {
    const valor = lista[i]?.avance;
    if (valor === null || valor === undefined) continue;

    const numero = Number(valor);
    if (!Number.isFinite(numero)) continue;

    return Math.min(100, Math.max(0, Math.round(numero)));
  }

  return Math.min(95, lista.length * 10);
};

/**
 * Indica si el equipo ya tiene un mantenimiento abierto. Se usa como guardia
 * defensiva al iniciar uno nuevo, aunque el estado del equipo sea inconsistente.
 */
export const tieneMantenimientoEnProceso = (mantenimientos = []) =>
  (Array.isArray(mantenimientos) ? mantenimientos : []).some(
    (item) => item?.estado === "En proceso"
  );
