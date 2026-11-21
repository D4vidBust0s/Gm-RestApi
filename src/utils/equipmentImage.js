/**
 * Validación y extracción de imágenes de equipos.
 *
 * Se usa el mismo patrón de Tasks/Chat: la imagen viaja como data URL dentro
 * del documento. Para no inflar los listados se guarda también una miniatura.
 */

const DATA_URL = /^data:(image\/(?:png|jpe?g|webp));base64,([A-Za-z0-9+/=\s]+)$/i;

export const MAX_BYTES_IMAGEN = 4 * 1024 * 1024;
export const MAX_BYTES_MINIATURA = 512 * 1024;

const largoMaximo = (bytes) => Math.ceil(bytes * 1.4);

const parsear = (valor) => {
  const dataUrl = String(valor?.dataUrl ?? valor?.url ?? valor ?? "").trim();
  const coincidencia = DATA_URL.exec(dataUrl);
  if (!coincidencia) return null;

  const tipo = coincidencia[1].toLowerCase();
  const base64 = coincidencia[2].replace(/\s/g, "");
  const bytes = Buffer.from(base64, "base64").length;
  const mime = tipo === "image/jpg" ? "image/jpeg" : tipo;

  return { dataUrl, tipo: mime, base64, bytes };
};

/**
 * Normaliza una imagen recibida del cliente.
 * Devuelve { imagen } o { error }.
 */
export const normalizarImagen = (valor, { maxBytes = MAX_BYTES_IMAGEN } = {}) => {
  if (valor === undefined) return { imagen: undefined, error: null };
  if (valor === null || valor === "" || valor?.dataUrl === "") {
    return { imagen: null, error: null };
  }

  const parseada = parsear(valor);
  if (!parseada) {
    return {
      imagen: null,
      error: "La imagen debe ser un data URL JPG, PNG o WebP",
    };
  }

  if (parseada.bytes > maxBytes) {
    const limite = Math.round(maxBytes / (1024 * 1024));
    return { imagen: null, error: `La imagen no puede superar ${limite} MB` };
  }

  return {
    imagen: {
      dataUrl: parseada.dataUrl,
      tipo: parseada.tipo,
      nombre: String(valor?.nombre ?? "equipo").slice(0, 200),
      actualizadaEn: new Date(),
    },
    error: null,
  };
};

/** Convierte el data URL guardado en un Buffer listo para responder. */
export const imagenABuffer = (imagen) => {
  const parseada = parsear(imagen);
  if (!parseada) return null;

  return {
    buffer: Buffer.from(parseada.base64, "base64"),
    tipo: parseada.tipo,
  };
};

export const imagenLargoMaximo = largoMaximo;
