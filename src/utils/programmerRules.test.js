/*
  Pruebas de las reglas puras del flujo de requerimientos.
  Ejecutar en GM-RestApi con: npm run test:rules
*/

import assert from "node:assert/strict";

import {
  crearAsignadoPlanificador,
  esEstadoFinal,
  estadoAprobado,
  estadoTrasAsignacion,
  hayCruce,
  intervaloEvento,
  lineaPersonalParaTrabajador,
  motivoObligatorio,
  personalCompleto,
  permiteAsignarPersonal,
  rangoAnioUtc,
  rangoDiaUtc,
  transicionDecisionValida,
} from "./programmerRules";

const fechaClave = "2031-05-20T05:00:00.000Z"; // medianoche local en Colombia
const inicio = "2031-05-20T13:00:00.000Z"; // 08:00 local
const fin = "2031-05-20T15:00:00.000Z"; // 10:00 local

const intervalo = intervaloEvento(fechaClave, inicio, fin);
assert.ok(intervalo, "El intervalo debe construirse");
assert.equal(intervalo.inicio.toISOString(), "2031-05-20T08:00:00.000Z");
assert.equal(intervalo.fin.toISOString(), "2031-05-20T10:00:00.000Z");

const nocturno = intervaloEvento(
  fechaClave,
  "2031-05-21T03:00:00.000Z", // 22:00 local del día clave
  "2031-05-21T07:00:00.000Z" // 02:00 local del día siguiente
);
assert.ok(nocturno, "El intervalo nocturno debe construirse");
assert.equal(nocturno.inicio.toISOString(), "2031-05-20T22:00:00.000Z");
assert.equal(nocturno.fin.toISOString(), "2031-05-21T02:00:00.000Z");

assert.equal(
  hayCruce(
    intervalo,
    intervaloEvento(fechaClave, inicio, "2031-05-20T14:00:00.000Z")
  ),
  true,
  "Dos eventos que comparten una hora deben cruzarse"
);
assert.equal(
  hayCruce(
    intervalo,
    intervaloEvento(fechaClave, "2031-05-20T15:00:00.000Z", "2031-05-20T16:00:00.000Z")
  ),
  false,
  "Eventos consecutivos no deben cruzarse"
);

const rango = rangoDiaUtc(fechaClave);
assert.ok(rango, "El rango del día debe existir");
assert.equal(rango.inicio.toISOString(), "2031-05-20T00:00:00.000Z");
assert.equal(rango.fin.toISOString(), "2031-05-21T00:00:00.000Z");

const rango2031 = rangoAnioUtc(2031);
assert.ok(rango2031, "El rango anual debe existir");
assert.equal(rango2031.inicio.toISOString(), "2031-01-01T00:00:00.000Z");
assert.equal(rango2031.fin.toISOString(), "2032-01-01T00:00:00.000Z");
assert.equal(rangoAnioUtc("2031").inicio.toISOString(), "2031-01-01T00:00:00.000Z");
assert.equal(rangoAnioUtc("no-es-año"), null);

assert.equal(esEstadoFinal("Aprobada"), true);
assert.equal(esEstadoFinal("Agendado"), true);
assert.equal(esEstadoFinal("Rechazada"), true);
assert.equal(esEstadoFinal("Pendiente"), false);
assert.equal(esEstadoFinal("En revisión"), false);

assert.equal(
  personalCompleto([
    {
      Cantidad: 2,
      Asignados: [{ Id: "1" }, { Id: "2" }],
    },
  ]),
  true,
  "Dos asignados para dos cupos es personal completo"
);
assert.equal(
  personalCompleto([
    {
      Cantidad: 2,
      Asignados: [{ Id: "1" }],
    },
  ]),
  false,
  "Un asignado para dos cupos está incompleto"
);
assert.equal(
  personalCompleto([{ cantidad: 1, asignados: [{ userId: "1" }] }]),
  true,
  "También entiende el shape camelCase de Requirements"
);
assert.equal(personalCompleto([]), false, "Sin personal no hay agenda");
assert.equal(
  personalCompleto([{ Cantidad: 0, Asignados: [] }]),
  false,
  "Las líneas sin cupo no cuentan como personal completo"
);

assert.equal(
  estadoAprobado([{ Cantidad: 1, Asignados: [{ Id: "1" }] }]),
  "Agendado"
);
assert.equal(estadoAprobado([{ Cantidad: 1, Asignados: [] }]), "Aprobada");
assert.equal(
  estadoTrasAsignacion("Pendiente", [
    { Cantidad: 1, Asignados: [{ Id: "1" }] },
  ]),
  "Pendiente",
  "Antes de aprobar no se agenda"
);
assert.equal(
  estadoTrasAsignacion("Aprobada", [
    { Cantidad: 1, Asignados: [{ Id: "1" }] },
  ]),
  "Agendado"
);
assert.equal(
  estadoTrasAsignacion("Agendado", [{ Cantidad: 1, Asignados: [] }]),
  "Aprobada",
  "Si se retira el personal vuelve a Aprobada"
);

assert.equal(permiteAsignarPersonal("Aprobada"), true);
assert.equal(permiteAsignarPersonal("Agendado"), true);
assert.equal(permiteAsignarPersonal("Pendiente"), true);
assert.equal(permiteAsignarPersonal("Rechazada"), false);

const personalProgramador = [
  {
    RolId: "64d68a55c03c4b1c7359db2f",
    Rol: "Sonidistas",
    Cantidad: 1,
    Asignados: [],
  },
  {
    RolId: "650773b67c61f26c6f811a47",
    Rol: "Luminotécnicos",
    Cantidad: 1,
    Asignados: [],
  },
];

assert.equal(
  lineaPersonalParaTrabajador(personalProgramador, {
    grupoID: "64d68a55c03c4b1c7359db2f",
    grupo: "64d68a55c03c4b1c7359db2f",
  })?.Rol,
  "Sonidistas",
  "La línea se encuentra por id de grupo"
);
assert.equal(
  lineaPersonalParaTrabajador(personalProgramador, {
    grupoID: "",
    grupo: "Luminotecnicos",
  })?.Rol,
  "Luminotécnicos",
  "La línea se encuentra por nombre sin tildes"
);
assert.equal(
  lineaPersonalParaTrabajador(personalProgramador, {
    grupoID: "otro",
    grupo: "Otro grupo",
  }),
  null
);

const asignadoPlanner = crearAsignadoPlanificador(
  {
    _id: "worker-1",
    nombres: "Felipe",
    apellidos: "Lizarazo",
    cargo: "Sonidista",
    grupoID: "64d68a55c03c4b1c7359db2f",
  },
  "64d68a55c03c4b1c7359db2f"
);
assert.equal(asignadoPlanner.Id, "worker-1");
assert.equal(asignadoPlanner.Nombre, "Felipe Lizarazo");
assert.equal(asignadoPlanner.GrupoId, "64d68a55c03c4b1c7359db2f");
assert.equal(asignadoPlanner.Origen, "planner");
assert.equal(asignadoPlanner.AsignadoPorId, "planner");

assert.equal(transicionDecisionValida("Pendiente", "Aprobada"), true);
assert.equal(transicionDecisionValida("Pendiente", "Rechazada"), true);
assert.equal(transicionDecisionValida("Pendiente", "En revisión"), true);
assert.equal(transicionDecisionValida("Aprobada", "Rechazada"), false);
assert.equal(transicionDecisionValida("Rechazada", "Aprobada"), false);

assert.equal(motivoObligatorio("Rechazada"), true);
assert.equal(motivoObligatorio("En revisión"), true);
assert.equal(motivoObligatorio("Aprobada"), false);

console.log("programmerRules: todas las pruebas pasaron");
