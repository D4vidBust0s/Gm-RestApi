/*
  Pruebas puras de las reglas de Assignments.
  Ejecutar en GM-RestApi con: npm run test:assignments
*/

import assert from "node:assert/strict";

import {
  CODIGO_APROBACION_TEMPORAL,
  MAX_INTENTOS_CODIGO,
  codigoTemporalValido,
  esOrigenElegible,
  estadoTrasIntentoFallido,
  validarDescarga,
} from "./assignmentRules";

assert.equal(CODIGO_APROBACION_TEMPORAL, "123");
assert.equal(codigoTemporalValido("123"), true);
assert.equal(codigoTemporalValido(" 123 "), true);
assert.equal(codigoTemporalValido("000"), false);
assert.equal(codigoTemporalValido(""), false);

assert.equal(esOrigenElegible("Aprobada"), true);
assert.equal(esOrigenElegible("Agendado"), true);
assert.equal(esOrigenElegible("Pendiente"), false);
assert.equal(esOrigenElegible("Rechazada"), false);

const equiposCustodia = [
  { equipoId: "eq1", placaSnapshot: "CAM-01" },
  { equipoId: "eq2", placaSnapshot: "LUZ-01" },
];

assert.equal(
  validarDescarga({
    equiposCustodia,
    items: [],
    revisadoFisicamente: true,
  }).error,
  "Debes registrar el resultado de todos los equipos de la Assignment"
);

assert.equal(
  validarDescarga({
    equiposCustodia,
    revisadoFisicamente: false,
    items: [
      { equipoId: "eq1", resultado: "Sin novedad" },
      { equipoId: "eq2", resultado: "Sin novedad" },
    ],
  }).error,
  "Debes confirmar que revisaste físicamente los equipos"
);

const sinNovedad = validarDescarga({
  equiposCustodia,
  revisadoFisicamente: true,
  items: [
    { equipoId: "eq1", resultado: "Sin novedad" },
    { equipoId: "eq2", resultado: "Sin novedad" },
  ],
});
assert.equal(sinNovedad.error, undefined);
assert.equal(sinNovedad.resultado, "Sin novedad");

const conNovedad = validarDescarga({
  equiposCustodia,
  revisadoFisicamente: true,
  items: [
    { equipoId: "eq1", resultado: "Sin novedad" },
    {
      equipoId: "eq2",
      resultado: "Con novedad",
      novedadTipo: "Daño",
      novedadDescripcion: "Pantalla rota",
      accionNovedad: "Mantenimiento",
    },
  ],
});
assert.equal(conNovedad.error, undefined);
assert.equal(conNovedad.resultado, "Con novedad");
assert.equal(conNovedad.items[1].accionNovedad, "Mantenimiento");

assert.equal(
  validarDescarga({
    equiposCustodia,
    revisadoFisicamente: true,
    items: [
      { equipoId: "eq1", resultado: "Sin novedad" },
      {
        equipoId: "eq2",
        resultado: "Con novedad",
        novedadTipo: "Daño",
        novedadDescripcion: "Pantalla rota",
      },
    ],
  }).error,
  "Selecciona si el equipo va a Mantenimiento o a un Caso especial"
);

assert.equal(
  validarDescarga({
    equiposCustodia,
    revisadoFisicamente: true,
    items: [{ equipoId: "eq1", resultado: "Sin novedad" }],
  }).error,
  "Debes registrar el resultado de todos los equipos de la Assignment"
);

assert.equal(
  validarDescarga({
    equiposCustodia,
    revisadoFisicamente: true,
    items: [
      { equipoId: "eq1", resultado: "Sin novedad" },
      { equipoId: "eq1", resultado: "Con novedad" },
    ],
  }).error,
  "Un equipo está repetido en la descarga"
);

const intento = estadoTrasIntentoFallido(MAX_INTENTOS_CODIGO);
assert.equal(intento.bloqueada, true);
assert.equal(intento.intentosRestantes, 0);

console.log("assignmentRules: todas las pruebas pasaron");
