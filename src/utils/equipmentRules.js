/**
 * Reglas puras del inventario de GM-Activos.
 *
 * Aquí vive lo que no depende de MongoDB: normalización de placas, matriz de
 * estados, detección de cruces de franja y resumen de disponibilidad. El
 * controlador y las pruebas usan exactamente las mismas funciones.
 */

export const ESTADOS_EQUIPO = ["Activo", "Inactivo"];

const texto = (valor) => String(valor ?? "").trim();

export const MOTIVOS_INACTIVO = [
  "Mantenimiento",
  "Protegido",
  "Baja",
  "Novedad",
];

/** Motivos que un usuario puede fijar con el cambio de estado genérico. */
export const MOTIVOS_TRANSICION_MANUAL = ["Protegido", "Baja"];

/** Motivos permitidos al crear un equipo. La baja solo se decide después. */
export const MOTIVOS_CREACION = ["Protegido"];

export const normalizarTexto = (valor) =>
  String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

/**
 * Clave de unicidad de la placa. El código de barras puede venir con espacios
 * o en minúsculas; la identidad física no debe duplicarse por eso.
 */
export const normalizarPlaca = (valor) =>
  normalizarTexto(valor).replace(/\s+/g, " ");

export const esObjectIdValido = (valor) =>
  /^[a-f0-9]{24}$/i.test(String(valor ?? "").trim());

/**
 * Descripción técnica visible de un equipo.
 *
 * La descripción es una sola por subcategoría (se edita en Catalogs); si la
 * subcategoría no la tiene se hereda la de la categoría y, como último recurso,
 * se respeta el texto legado guardado en el propio equipo. Así los registros
 * anteriores siguen mostrando algo mientras se completa el catálogo.
 *
 * Requiere `categoriaId` y `subcategoriaId` populados con `descripcion`.
 */
export const descripcionEquipo = (equipo) => {
  const subcategoria = equipo?.subcategoriaId;
  const categoria = equipo?.categoriaId;

  const deSubcategoria =
    subcategoria && typeof subcategoria === "object"
      ? texto(subcategoria.descripcion)
      : "";
  if (deSubcategoria) return deSubcategoria;

  const deCategoria =
    categoria && typeof categoria === "object" ? texto(categoria.descripcion) : "";
  if (deCategoria) return deCategoria;

  return texto(equipo?.descripcion);
};

/** Estado que ve el usuario, derivado del estado persistido y la agenda. */
export const estadoVisible = ({
  estado,
  motivoInactivo,
  tieneReservaVigente = false,
  tieneCustodiaActiva = false,
}) => {
  if (estado === "Inactivo") return motivoInactivo || "Inactivo";
  return tieneCustodiaActiva || tieneReservaVigente
    ? "Asignado"
    : "Disponible";
};

export const hayCruce = (inicioA, finA, inicioB, finB) => {
  if (!inicioA || !finA || !inicioB || !finB) return false;

  return (
    new Date(inicioA).getTime() < new Date(finB).getTime() &&
    new Date(finA).getTime() > new Date(inicioB).getTime()
  );
};

/**
 * Valida un cambio de estado contra la matriz de negocio.
 * Devuelve { ok: true } o { ok: false, error }.
 */
export const validarTransicionEstado = ({
  estadoActual,
  motivoActual = null,
  estadoNuevo,
  motivoNuevo = null,
  tieneReservas = false,
}) => {
  if (!ESTADOS_EQUIPO.includes(estadoNuevo)) {
    return { ok: false, error: "El estado debe ser Activo o Inactivo" };
  }

  const actual = estadoActual === "Inactivo" ? `Inactivo:${motivoActual}` : "Activo";
  const nuevo = estadoNuevo === "Inactivo" ? `Inactivo:${motivoNuevo}` : "Activo";

  if (actual === nuevo) {
    return { ok: false, error: "El equipo ya está en ese estado" };
  }

  if (actual === "Inactivo:Baja") {
    return {
      ok: false,
      error: "Un equipo dado de baja no se puede reactivar; conserva su hoja de vida",
    };
  }

  if (actual === "Inactivo:Mantenimiento" || nuevo === "Inactivo:Mantenimiento") {
    return {
      ok: false,
      error:
        "El mantenimiento se gestiona desde Maintenance → Activos, no con un cambio de estado",
    };
  }

  if (estadoNuevo === "Inactivo") {
    if (motivoNuevo === "Novedad" || actual === "Inactivo:Novedad") {
      return {
        ok: false,
        error:
          "El estado Novedad solo se asigna y se cierra desde Assignments → Cases",
      };
    }

    if (!["Mantenimiento", "Protegido", "Baja"].includes(motivoNuevo)) {
      return {
        ok: false,
        error: "El motivo debe ser Mantenimiento, Protegido o Baja",
      };
    }

    if (tieneReservas) {
      return {
        ok: false,
        error:
          "El equipo tiene reservas activas. Libéralas antes de cambiar a un estado inactivo",
      };
    }

    return { ok: true };
  }

  // Destino Activo: solo desde Protegido o Mantenimiento.
  if (!["Inactivo:Protegido", "Inactivo:Mantenimiento"].includes(actual)) {
    return {
      ok: false,
      error: `No se puede pasar de "${actual}" a "Activo"`,
    };
  }

  return { ok: true };
};

/** Valida el estado inicial permitido al crear un equipo. */
export const validarEstadoCreacion = ({ estado, motivoInactivo }) => {
  if (estado === undefined || estado === null || estado === "") {
    return { ok: true, estado: "Inactivo", motivoInactivo: "Protegido" };
  }

  if (!ESTADOS_EQUIPO.includes(estado)) {
    return { ok: false, error: "El estado inicial debe ser Activo o Inactivo" };
  }

  if (estado === "Activo") return { ok: true, estado: "Activo", motivoInactivo: null };

  if (!MOTIVOS_CREACION.includes(motivoInactivo)) {
    return {
      ok: false,
      error:
        "Un equipo nuevo solo puede crearse como Protegido; el mantenimiento se inicia desde Maintenance",
    };
  }

  return { ok: true, estado: "Inactivo", motivoInactivo };
};

/**
 * Calcula el resumen que ve el selector de equipos:
 * total, inactivos, reservados en la franja y disponibles.
 *
 * `reservados` es un Set de ids de equipos con reserva activa que cruza.
 */
export const construirResumenDisponibilidad = ({
  equipos = [],
  reservados = new Set(),
  enCustodia = new Set(),
}) => {
  const resumen = {
    total: equipos.length,
    inactivos: 0,
    reservadosEnFranja: 0,
    asignadosEnCustodia: 0,
    disponibles: 0,
  };

  const disponibles = [];

  equipos.forEach((equipo) => {
    const id = String(equipo?._id ?? equipo?.id ?? "");

    if (equipo?.estado === "Inactivo") {
      resumen.inactivos += 1;
      return;
    }

    if (enCustodia.has(id)) {
      resumen.asignadosEnCustodia += 1;
      return;
    }

    if (reservados.has(id)) {
      resumen.reservadosEnFranja += 1;
      return;
    }

    resumen.disponibles += 1;
    disponibles.push(equipo);
  });

  return { resumen, disponibles };
};

/** Lista de restricciones de texto de un equipo. */
export const textosRestricciones = (equipo) =>
  (Array.isArray(equipo?.restricciones) ? equipo.restricciones : [])
    .map((item) => String(item?.texto ?? item ?? "").trim())
    .filter(Boolean);

/** ¿El requerimiento ya aceptó todas las restricciones de sus equipos? */
export const restriccionesPendientes = ({ equipos = [], aceptaRestricciones = false }) => {
  if (aceptaRestricciones) return [];

  const pendientes = [];

  equipos.forEach((equipo) => {
    const textos = textosRestricciones(equipo);
    if (textos.length === 0) return;
    if (equipo?.restriccionesAceptadasPor) return;

    pendientes.push({
      equipoId: String(equipo?._id ?? equipo?.id ?? ""),
      placa: equipo?.placa ?? "",
      restricciones: textos,
    });
  });

  return pendientes;
};
