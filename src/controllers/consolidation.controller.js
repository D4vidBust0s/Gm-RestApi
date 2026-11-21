/*
  Consolidación de turnos.

  Estas rutas solo ACTUALIZAN turnos existentes de /shifts: nunca crean ni
  eliminan registros. La programación estructural sigue viviendo en el
  planificador (ModalPlanner1).

  Contrato del body (camelCase, igual que POST /shifts):
    index, idPrograma, eventId, tipo, color, observacion, idSchema,
    inicioMain, out, estadoConsolidacion, observacionConsolidacion,
    consolidadoPor, consolidadoPorId, minutosConsolidados
*/

import Shifts from "../models/Shifts";
import { anunciarCambioPlanner } from "../utils/plannerEvents";

const ESTADOS_CONSOLIDACION = [
  "Pendiente",
  "Validado",
  "Ajustado",
  "NoLaborado",
];

const TIPOS_TURNO = [
  "Null",
  "Programa",
  "Secondary",
  "Requerimiento",
  "Custom",
  "TimeOut",
  "Programmer",
];

const MAX_ACTUALIZACIONES = 100;
const MAX_MINUTOS = 24 * 60;

const aTexto = (valor) =>
  valor === null || valor === undefined ? "" : String(valor).trim();

const aFecha = (valor) => {
  if (valor === null || valor === undefined || valor === "") return null;

  const texto = String(valor).trim();
  if (!texto || texto === "------") return null;

  const fecha = new Date(texto);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
};

const aEntero = (valor) => {
  const numero = Number(valor);
  return Number.isInteger(numero) ? numero : null;
};

/* Una consolidación nunca debe mover turnos de fechas futuras. */
const esFechaFutura = (fecha) => {
  if (!fecha) return false;

  const valor = new Date(fecha);
  if (Number.isNaN(valor.getTime())) return false;

  const dia = new Date(valor);
  dia.setHours(0, 0, 0, 0);

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  return dia.getTime() > hoy.getTime();
};

/* Campos de texto simples: body (camelCase) -> schema (PascalCase). */
const CAMPOS_TEXTO = {
  idPrograma: "Event_name",
  eventId: "ID_event",
  tipo: "Type",
  color: "Color",
  observacion: "Observacion",
  idSchema: "Id_Schema",
  observacionConsolidacion: "ObservacionConsolidacion",
  consolidadoPor: "ConsolidadoPor",
  consolidadoPorId: "ConsolidadoPorId",
};

/**
 * Construye el $set de un turno y devuelve los errores de validación.
 * No acepta ID_user, Nombres ni Fecha_clave: son inmutables desde aquí.
 */
const construirActualizacion = (body = {}) => {
  const update = {};
  const errores = [];

  Object.entries(CAMPOS_TEXTO).forEach(([origen, destino]) => {
    if (body[origen] === undefined) return;

    const valor = aTexto(body[origen]);

    if (origen === "tipo" && valor && !TIPOS_TURNO.includes(valor)) {
      errores.push("El tipo de evento no es válido.");
      return;
    }

    update[destino] = valor;
  });

  if (body.index !== undefined) {
    const index = aEntero(body.index);

    if (index === null || index < 0) {
      errores.push("El índice del turno debe ser un entero mayor o igual a 0.");
    } else {
      update.Index = index;
    }
  }

  if (body.inicioMain !== undefined) {
    const inicio = aFecha(body.inicioMain);

    if (!inicio) {
      errores.push("La hora de inicio no es válida.");
    } else {
      update.Inicio_main = inicio.toISOString();
    }
  }

  if (body.out !== undefined) {
    const textoOut = aTexto(body.out);

    if (textoOut === "------") {
      update.Out = "------";
    } else {
      const out = aFecha(textoOut);

      if (!out) {
        errores.push("La hora de fin no es válida.");
      } else {
        update.Out = out.toISOString();
      }
    }
  }

  if (update.Inicio_main && update.Out && update.Out !== "------") {
    const inicio = new Date(update.Inicio_main);
    const fin = new Date(update.Out);

    if (!(fin.getTime() > inicio.getTime())) {
      errores.push(
        "La hora de fin debe ser posterior a la de inicio. Si el turno cruza medianoche, envíe la fecha del día siguiente."
      );
    }
  }

  if (body.estadoConsolidacion !== undefined) {
    const estado = aTexto(body.estadoConsolidacion);

    if (!ESTADOS_CONSOLIDACION.includes(estado)) {
      errores.push("El estado de consolidación no es válido.");
    } else {
      update.EstadoConsolidacion = estado;
    }
  }

  if (body.minutosConsolidados !== undefined) {
    if (
      body.minutosConsolidados === null ||
      body.minutosConsolidados === ""
    ) {
      update.MinutosConsolidados = null;
    } else {
      const minutos = aEntero(body.minutosConsolidados);

      if (minutos === null || minutos < 0 || minutos > MAX_MINUTOS) {
        errores.push(
          "Los minutos consolidados deben ser un entero entre 0 y 1440."
        );
      } else {
        update.MinutosConsolidados = minutos;
      }
    }
  }

  const estadoFinal = update.EstadoConsolidacion;

  if (estadoFinal && estadoFinal !== "Pendiente") {
    if (update.MinutosConsolidados === undefined || update.MinutosConsolidados === null) {
      errores.push("Debe enviar los minutos consolidados del turno.");
    }

    if (!aTexto(body.consolidadoPor)) {
      errores.push("Debe registrar el usuario que consolida.");
    }

    if (
      (estadoFinal === "Ajustado" || estadoFinal === "NoLaborado") &&
      !aTexto(update.ObservacionConsolidacion)
    ) {
      errores.push(
        "Debe registrar una observación para los turnos ajustados o no laborados."
      );
    }

    update.Consolidado = true;
    update.ConsolidadoEn = new Date();
  } else if (estadoFinal === "Pendiente") {
    update.Consolidado = false;
    update.ConsolidadoPor = "";
    update.ConsolidadoPorId = "";
    update.ConsolidadoEn = null;
    update.MinutosConsolidados = null;
  }

  return { update, errores };
};

const responderError = (res, error, mensaje) => {
  if (error?.name === "CastError") {
    return res
      .status(400)
      .json({ message: "El identificador del turno no es válido." });
  }

  if (error?.name === "ValidationError") {
    return res.status(400).json({ message: error.message });
  }

  console.error(mensaje, error);
  return res
    .status(500)
    .json({ message: error?.message || "No se pudo actualizar el turno." });
};

/* PUT /api/shifts/consolidation/:id */
export const updateConsolidation = async (req, res) => {
  const { id } = req.params;

  try {
    const turno = await Shifts.findById(id);

    if (!turno) {
      return res
        .status(404)
        .json({ message: "El turno no existe o ya fue eliminado." });
    }

    if (esFechaFutura(turno.Fecha_clave)) {
      return res.status(400).json({
        message: "No se puede consolidar un turno de una fecha futura.",
      });
    }

    const { update, errores } = construirActualizacion(req.body);

    if (errores.length > 0) {
      return res.status(400).json({ message: errores[0], errores });
    }

    Object.assign(turno, update);
    const guardado = await turno.save();

    anunciarCambioPlanner("shifts", {
      action: "updated",
      id: guardado._id,
      fechaClave: guardado.Fecha_clave,
    });

    return res.json(guardado);
  } catch (error) {
    return responderError(res, error, "Error al consolidar el turno:");
  }
};

/* PUT /api/shifts/consolidation  { updates: [{ id, ...campos }] } */
export const updateConsolidationBulk = async (req, res) => {
  const updates = Array.isArray(req.body?.updates) ? req.body.updates : null;

  if (!updates || updates.length === 0) {
    return res
      .status(400)
      .json({ message: "Debe enviar al menos un turno para consolidar." });
  }

  if (updates.length > MAX_ACTUALIZACIONES) {
    return res.status(400).json({
      message: `Solo se pueden actualizar ${MAX_ACTUALIZACIONES} turnos por solicitud.`,
    });
  }

  let actualizados = 0;
  const fallidos = [];

  for (const item of updates) {
    const id = aTexto(item?.id);

    if (!id) {
      fallidos.push({
        id: "",
        mensaje: "Falta el identificador del turno.",
      });
      continue;
    }

    try {
      const turno = await Shifts.findById(id);

      if (!turno) {
        fallidos.push({
          id,
          mensaje: "El turno no existe o ya fue eliminado.",
        });
        continue;
      }

      if (esFechaFutura(turno.Fecha_clave)) {
        fallidos.push({
          id,
          mensaje: "No se puede consolidar un turno de una fecha futura.",
        });
        continue;
      }

      const { update, errores } = construirActualizacion(item);

      if (errores.length > 0) {
        fallidos.push({ id, mensaje: errores[0] });
        continue;
      }

      Object.assign(turno, update);
      await turno.save();
      actualizados += 1;
    } catch (error) {
      if (error?.name === "CastError") {
        fallidos.push({ id, mensaje: "Identificador inválido." });
      } else if (error?.name === "ValidationError") {
        fallidos.push({ id, mensaje: error.message });
      } else {
        console.error("Error al consolidar un turno en lote:", error);
        fallidos.push({
          id,
          mensaje: error?.message || "No se pudo actualizar el turno.",
        });
      }
    }
  }

  if (actualizados > 0) {
    anunciarCambioPlanner("shifts", {
      action: "bulk",
      id: null,
    });
  }

  return res.json({ actualizados, fallidos });
};
