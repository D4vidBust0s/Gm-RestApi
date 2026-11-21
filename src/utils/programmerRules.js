/**
 * Reglas puras del flujo de requerimientos manuales.
 * Se usan en el controlador y se pueden probar sin base de datos.
 */

export const ESTADOS_REQUERIMIENTO = [
  "Pendiente",
  "En revisión",
  "Aprobada",
  "Agendado",
  "Rechazada",
];

export const ESTADOS_EDITABLES = ["Pendiente", "En revisión"];
export const ESTADOS_FINALES = ["Aprobada", "Agendado", "Rechazada"];

export const normalizar = (valor) =>
  String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

export const esEstadoEditable = (estado) =>
  ESTADOS_EDITABLES.includes(estado);

export const esEstadoFinal = (estado) => ESTADOS_FINALES.includes(estado);

const asignadosDe = (linea) =>
  Array.isArray(linea?.Asignados)
    ? linea.Asignados
    : Array.isArray(linea?.asignados)
      ? linea.asignados
      : [];

const cantidadDe = (linea) =>
  Number(linea?.Cantidad ?? linea?.cantidad ?? 0) || 0;

/**
 * Personal completo: hay al menos una línea con cupo y todas las líneas
 * tienen tantas personas asignadas como cupos solicitados.
 */
export const personalCompleto = (personal) => {
  const lineas = (Array.isArray(personal) ? personal : []).filter(
    (linea) => cantidadDe(linea) > 0
  );

  if (lineas.length === 0) return false;

  return lineas.every(
    (linea) => asignadosDe(linea).length >= cantidadDe(linea)
  );
};

/** Estado resultante de una aprobación según el personal asignado. */
export const estadoAprobado = (personal) =>
  personalCompleto(personal) ? "Agendado" : "Aprobada";

/** Recalcula el estado cuando cambia el personal de un requerimiento. */
export const estadoTrasAsignacion = (estadoActual, personal) => {
  if (!["Aprobada", "Agendado"].includes(estadoActual)) return estadoActual;
  return estadoAprobado(personal);
};

/** Estados que permiten gestionar personal; el rechazado no. */
export const permiteAsignarPersonal = (estado) =>
  ["Pendiente", "En revisión", "Aprobada", "Agendado"].includes(estado);

export const ORIGEN_ASIGNACION_PLANIFICADOR = "planner";
export const ORIGEN_ASIGNACION_MANUAL = "manual";

const texto = (valor) => String(valor ?? "").trim();

const normalizarNombre = (valor) =>
  texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

/** Busca la línea de personal del programador que corresponde al trabajador. */
export const lineaPersonalParaTrabajador = (personal, trabajador) => {
  const grupoId = texto(trabajador?.grupoID ?? trabajador?.GrupoID);
  const grupoNombre = normalizarNombre(
    trabajador?.grupo ?? trabajador?.Grupo
  );

  return (
    (Array.isArray(personal) ? personal : []).find((linea) => {
      const rolId = texto(linea?.RolId ?? linea?.rolId);
      if (grupoId && rolId && rolId === grupoId) return true;

      const rol = normalizarNombre(linea?.Rol ?? linea?.rol);
      return Boolean(grupoNombre && rol && rol === grupoNombre);
    }) ?? null
  );
};

/** Entrada de personal creada automáticamente desde Programador de Turnos. */
export const crearAsignadoPlanificador = (trabajador, grupoId = "") => ({
  Id: texto(trabajador?._id ?? trabajador?.id ?? trabajador?.Id),
  Nombre: `${texto(trabajador?.nombres ?? trabajador?.Nombres)} ${texto(
    trabajador?.apellidos ?? trabajador?.Apellidos
  )}`.trim(),
  Cargo: texto(trabajador?.cargo ?? trabajador?.Cargo),
  GrupoId: texto(
    grupoId || trabajador?.grupoID || trabajador?.GrupoID || trabajador?.grupo
  ),
  AsignadoEl: new Date(),
  AsignadoPor: "Programador de Turnos",
  AsignadoPorId: ORIGEN_ASIGNACION_PLANIFICADOR,
  Origen: ORIGEN_ASIGNACION_PLANIFICADOR,
});

export const motivoObligatorio = (estadoNuevo) =>
  estadoNuevo === "Rechazada" || estadoNuevo === "En revisión";


export const transicionDecisionValida = (estadoActual, estadoNuevo) => {
  if (!ESTADOS_EDITABLES.includes(estadoActual)) return false;
  if (estadoNuevo === "En revisión") return estadoActual === "Pendiente";
  return estadoNuevo === "Aprobada" || estadoNuevo === "Rechazada";
};

export const minutosDelDia = (fecha) =>
  fecha.getUTCHours() * 60 + fecha.getUTCMinutes();

/**
 * Rango UTC que cubre el día de la Fecha_clave. Las fechas del sistema se
 * guardan como medianoche local (05:00Z en Colombia), por lo que el día UTC
 * coincide con el día local.
 */
export const rangoDiaUtc = (fechaClave) => {
  const base = new Date(fechaClave);
  if (Number.isNaN(base.getTime())) return null;

  const inicio = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate())
  );
  const fin = new Date(inicio);
  fin.setUTCDate(fin.getUTCDate() + 1);

  return { inicio, fin };
};

/** Rango anual en UTC para Fecha_clave (año calendario local de Colombia). */
export const rangoAnioUtc = (anio) => {
  const numero = Number(anio);
  if (!Number.isInteger(numero) || numero < 2000 || numero > 2200) {
    return null;
  }

  return {
    inicio: new Date(Date.UTC(numero, 0, 1)),
    fin: new Date(Date.UTC(numero + 1, 0, 1)),
  };
};

/**
 * Intervalo del evento en una línea de tiempo "de pared" anclada a la fecha
 * clave. La Fecha_clave se guarda como medianoche local (05:00Z en Colombia);
 * de ahí se obtiene el desfase y se reconstruye la hora local del evento sin
 * depender de la zona horaria del servidor. Si la hora final es menor o igual,
 * cruza medianoche.
 */
export const intervaloEvento = (fechaClave, timeIn, timeOut) => {
  const base = new Date(fechaClave);
  const inicioBase = new Date(timeIn);
  const finBase = new Date(timeOut);

  if (
    Number.isNaN(base.getTime()) ||
    Number.isNaN(inicioBase.getTime()) ||
    Number.isNaN(finBase.getTime())
  ) {
    return null;
  }

  const dia = Date.UTC(
    base.getUTCFullYear(),
    base.getUTCMonth(),
    base.getUTCDate()
  );
  const desfaseMinutos = base.getUTCHours() * 60 + base.getUTCMinutes();
  const normalizarMinutos = (minutos) =>
    ((minutos % 1440) + 1440) % 1440;

  const minutosInicio = normalizarMinutos(
    inicioBase.getUTCHours() * 60 +
      inicioBase.getUTCMinutes() -
      desfaseMinutos
  );
  const minutosFin = normalizarMinutos(
    finBase.getUTCHours() * 60 + finBase.getUTCMinutes() - desfaseMinutos
  );

  const inicio = new Date(dia + minutosInicio * 60000);
  const fin = new Date(dia + minutosFin * 60000);

  if (fin.getTime() <= inicio.getTime()) {
    fin.setUTCDate(fin.getUTCDate() + 1);
  }

  return { inicio, fin };
};

export const hayCruce = (a, b) => {
  if (!a || !b) return false;
  return a.inicio < b.fin && b.inicio < a.fin;
};

export const formatearHora = (fecha) => {
  if (!fecha) return "--:--";
  return new Date(fecha).toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};
