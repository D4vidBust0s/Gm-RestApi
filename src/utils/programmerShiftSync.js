/*
  Sincronización entre los turnos Type "Programmer" de ModalPlanner1 y el
  personal asignado del Programmer.

  Un turno programado para un trabajador cuenta como una asignación real. Al
  borrar el último turno del trabajador para ese programador, se libera la
  asignación creada desde el planificador. Las asignaciones manuales hechas
  desde la ficha de Programmer se conservan.
*/

import Payroll from "../models/Payroll";
import Programmers from "../models/Programmer";
import Shifts from "../models/Shifts";
import { broadcast } from "../realtime";
import {
  ORIGEN_ASIGNACION_PLANIFICADOR,
  crearAsignadoPlanificador,
  estadoTrasAsignacion,
  lineaPersonalParaTrabajador,
} from "./programmerRules";

const TIPO_PROGRAMMER = "Programmer";
const ACTOR = "Programador de Turnos";

const aplicarCambio = async (
  programmer,
  { accion, nota, usuario = {} } = {}
) => {
  const estadoAnterior = programmer.Estado;
  const estadoNuevo = estadoTrasAsignacion(
    estadoAnterior,
    programmer.Personal
  );

  programmer.Estado = estadoNuevo;
  programmer.Revision = Number(programmer.Revision ?? 0) + 1;
  programmer.ActualizadoPor = usuario.nombre || ACTOR;
  programmer.ActualizadoPorId =
    usuario.id || ORIGEN_ASIGNACION_PLANIFICADOR;

  const cambioEstado = estadoAnterior !== estadoNuevo;
  const tipo =
    cambioEstado && estadoNuevo === "Agendado"
      ? "agendamiento"
      : "asignacion";

  programmer.Historial = [
    ...(Array.isArray(programmer.Historial) ? programmer.Historial : []),
    {
      Tipo: tipo,
      EstadoAnterior: estadoAnterior,
      EstadoNuevo: estadoNuevo,
      Por: usuario.nombre || ACTOR,
      PorId: usuario.id || ORIGEN_ASIGNACION_PLANIFICADOR,
      El: new Date(),
      Nota: cambioEstado
        ? `${nota} Estado: ${estadoAnterior} → ${estadoNuevo}.`
        : nota,
    },
  ];

  const guardado = await programmer.save();

  broadcast("programmer:changed", {
    action: accion,
    id: String(guardado._id),
    estado: estadoNuevo,
    fechaClave: guardado.Fecha_clave,
  });

  return guardado;
};

/** Asigna al trabajador del turno en la línea de personal que corresponda. */
export const sincronizarPersonalProgramadorDesdeTurno = async (shift) => {
  if (!shift || shift.Type !== TIPO_PROGRAMMER) return null;

  const programmer = await Programmers.findById(shift.Event_name);
  if (!programmer) return null;

  const trabajador = await Payroll.findById(shift.ID_user).lean();
  if (!trabajador) return null;

  const linea = lineaPersonalParaTrabajador(programmer.Personal, trabajador);
  if (!linea) return null;

  const asignados = Array.isArray(linea.Asignados)
    ? linea.Asignados
    : [];

  if (asignados.some((item) => String(item.Id) === String(trabajador._id))) {
    return null;
  }

  if (asignados.length >= Number(linea.Cantidad ?? 0)) {
    return null;
  }

  linea.Asignados = [
    ...asignados,
    crearAsignadoPlanificador(trabajador, trabajador.grupoID),
  ];

  return aplicarCambio(programmer, {
    accion: "assigned",
    nota: `Personal asignado desde Programador de Turnos: ${
      trabajador.nombres ?? ""
    } ${trabajador.apellidos ?? ""}`.trim() + ` (${linea.Rol || linea.RolId}).`,
  });
};

/** Libera la asignación del planificador cuando ya no quedan turnos. */
export const liberarPersonalProgramadorDesdeTurno = async ({
  programmerId,
  workerId,
} = {}) => {
  if (!programmerId || !workerId) return null;

  const quedanTurnos = await Shifts.exists({
    ID_user: workerId,
    Event_name: programmerId,
    Type: TIPO_PROGRAMMER,
  });

  if (quedanTurnos) return null;

  const programmer = await Programmers.findById(programmerId);
  if (!programmer) return null;

  const liberados = [];

  (programmer.Personal ?? []).forEach((linea) => {
    const actuales = Array.isArray(linea.Asignados) ? linea.Asignados : [];
    const siguientes = actuales.filter(
      (item) =>
        !(
          String(item.Id) === String(workerId) &&
          item.Origen === ORIGEN_ASIGNACION_PLANIFICADOR
        )
    );

    if (siguientes.length === actuales.length) return;

    liberados.push(
      ...actuales.filter(
        (item) =>
          String(item.Id) === String(workerId) &&
          item.Origen === ORIGEN_ASIGNACION_PLANIFICADOR
      )
    );
    linea.Asignados = siguientes;
  });

  if (liberados.length === 0) return null;

  const nombres = liberados.map((item) => item.Nombre).filter(Boolean);

  return aplicarCambio(programmer, {
    accion: "released",
    nota: `Personal liberado al eliminar turno de Programador de Turnos: ${
      nombres.join(", ") || workerId
    }.`,
  });
};
