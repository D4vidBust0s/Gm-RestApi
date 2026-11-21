/*
  Turnos directos creados desde la ficha de Programmer.

  Asignar personal en Programmer equivale a programar directamente al
  trabajador para la fecha/hora del programador: no hay stack. El turno se
  marca con Origen "programmer-directo" para no confundirlo con los turnos
  creados desde ModalPlanner1.
*/

import Payroll from "../models/Payroll";
import Shifts from "../models/Shifts";
import { anunciarCambioPlanner } from "./plannerEvents";
import { ORIGEN_ASIGNACION_PLANIFICADOR } from "./programmerRules";

export const ORIGEN_TURNO_DIRECTO = "programmer-directo";
export const OBSERVACION_TURNO_DIRECTO = "Programación directa";

const texto = (valor) => String(valor ?? "").trim();

const aIso = (valor) => {
  if (!valor) return "";
  const fecha = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(fecha.getTime()) ? "" : fecha.toISOString();
};

const nombreTrabajador = (trabajador) =>
  `${texto(trabajador?.nombres ?? trabajador?.Nombres)} ${texto(
    trabajador?.apellidos ?? trabajador?.Apellidos
  )}`.trim();

const idsAsignados = (programmer) =>
  [
    ...new Set(
      (Array.isArray(programmer?.Personal) ? programmer.Personal : [])
        .flatMap((linea) =>
          Array.isArray(linea?.Asignados) ? linea.Asignados : []
        )
        .map((asignado) => texto(asignado?.Id))
        .filter(Boolean)
    ),
  ];

/** Crea el turno directo si no existe otro turno para ese Programmer. */
export const crearTurnoDirectoProgramador = async ({
  programmer,
  trabajador,
} = {}) => {
  if (!programmer || !trabajador) return null;

  if (!["Aprobada", "Agendado"].includes(programmer.Estado)) return null;

  const inicio = aIso(programmer.Time_in);
  const fin = aIso(programmer.Time_out);
  if (!inicio || !fin) return null;

  const workerId = texto(trabajador?._id ?? trabajador?.id);
  const programmerId = texto(programmer?._id ?? programmer?.id);
  if (!workerId || !programmerId) return null;

  const existente = await Shifts.exists({
    ID_user: workerId,
    Event_name: programmerId,
    Type: "Programmer",
  });

  if (existente) return null;

  const ultimo = await Shifts.findOne({
    ID_user: workerId,
    Fecha_clave: programmer.Fecha_clave,
  })
    .sort({ Index: -1 })
    .select("Index")
    .lean();

  const index = (Number(ultimo?.Index) || 0) + 1;

  return Shifts.create({
    ID_user: workerId,
    Nombres: nombreTrabajador(trabajador),
    Index: index,
    Event_name: programmerId,
    ID_event: "------",
    Color: "red",
    Observacion: OBSERVACION_TURNO_DIRECTO,
    Fecha_clave: programmer.Fecha_clave,
    Id_Schema: "------",
    Inicio_main: inicio,
    Out: fin,
    Type: "Programmer",
    Origen: ORIGEN_TURNO_DIRECTO,
  });
};

/**
 * Crea los turnos directos que falten para el personal asignado y marca esas
 * asignaciones como respaldadas por un turno.
 */
export const asegurarTurnosDirectosProgramador = async (programmer) => {
  if (!programmer || !["Aprobada", "Agendado"].includes(programmer.Estado)) {
    return 0;
  }

  const ids = idsAsignados(programmer);
  if (ids.length === 0) return 0;

  const trabajadores = await Payroll.find({ _id: { $in: ids } }).lean();
  const porId = new Map(
    trabajadores.map((trabajador) => [String(trabajador._id), trabajador])
  );

  let creados = 0;
  let cambioOrigen = false;

  for (const linea of programmer.Personal ?? []) {
    for (const asignado of linea.Asignados ?? []) {
      const trabajador = porId.get(String(asignado.Id));
      if (!trabajador) continue;

      try {
        const turno = await crearTurnoDirectoProgramador({
          programmer,
          trabajador,
        });

        if (!turno) continue;

        creados += 1;

        if (asignado.Origen !== ORIGEN_ASIGNACION_PLANIFICADOR) {
          asignado.Origen = ORIGEN_ASIGNACION_PLANIFICADOR;
          cambioOrigen = true;
        }
      } catch (error) {
        console.error(
          "No se pudo crear el turno directo del Programmer:",
          error?.message || error
        );
      }
    }
  }

  if (cambioOrigen) {
    await programmer.save();
  }

  if (creados > 0) {
    anunciarCambioPlanner("shifts", {
      action: "bulk",
      fechaClave: programmer?.Fecha_clave,
    });
  }

  return creados;
};

/** Elimina el turno directo de un trabajador concreto. */
export const eliminarTurnoDirectoProgramador = async ({
  programmerId,
  workerId,
} = {}) => {
  if (!programmerId || !workerId) return 0;

  const resultado = await Shifts.deleteMany({
    ID_user: texto(workerId),
    Event_name: texto(programmerId),
    Type: "Programmer",
    Origen: ORIGEN_TURNO_DIRECTO,
  });

  if (resultado?.deletedCount > 0) {
    anunciarCambioPlanner("shifts", { action: "deleted" });
  }

  return resultado?.deletedCount ?? 0;
};

/** Elimina todos los turnos directos de un Programmer. */
export const eliminarTurnosDirectosProgramador = async (programmerId) => {
  if (!programmerId) return 0;

  const resultado = await Shifts.deleteMany({
    Event_name: texto(programmerId),
    Type: "Programmer",
    Origen: ORIGEN_TURNO_DIRECTO,
  });

  if (resultado?.deletedCount > 0) {
    anunciarCambioPlanner("shifts", { action: "deleted" });
  }

  return resultado?.deletedCount ?? 0;
};
