/*
  Pruebas de adjuntos y seguimiento de mantenimiento.
  Ejecutar en GM-RestApi con: npm run test:equipment
*/

import assert from "node:assert/strict";

import {
  MAX_ADJUNTOS,
  calcularProgreso,
  mapearSeguimiento,
  normalizarAdjunto,
  normalizarAdjuntos,
  normalizarAvance,
  serializarAdjunto,
  tieneMantenimientoEnProceso,
} from "./equipmentMaintenance";
import { serializarEquipo } from "./equipmentSerializer";

const png =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z2ZkAAAAASUVORK5CYII=";

const valido = normalizarAdjunto({
  nombre: "foto.png",
  url: png,
  tamano: 1,
});
assert.equal(valido.error, undefined);
assert.equal(valido.adjunto.tipo, "image/png");
assert.equal(valido.adjunto.tamano, 68);

const invalido = normalizarAdjunto({
  nombre: "x.html",
  url: "data:text/html;base64,PGgxPkhvbGE8L2gxPg==",
});
assert.ok(invalido.error);

const lista = normalizarAdjuntos(
  Array.from({ length: MAX_ADJUNTOS + 1 }, () => ({ url: png }))
);
assert.ok(lista.error);

const seguimiento = mapearSeguimiento({
  seguimiento: {
    estado: "Pendiente",
    inicio: "2026-11-16T13:00:00.000Z",
    nota: "",
    anotaciones: [
      {
        _id: "6afb4711045b02c31908fff0",
        texto: "Revisado",
        por: "Almacén",
        creadoEn: "2026-11-16T14:00:00.000Z",
      },
    ],
  },
});
assert.equal(seguimiento.estado, "Pendiente");
assert.equal(seguimiento.anotaciones.length, 1);
assert.equal(seguimiento.anotaciones[0].por, "Almacén");

assert.equal(mapearSeguimiento({}), null);

const serializado = serializarAdjunto(
  {
    _id: "6afb4711045b02c31908ffed",
    mantenimientoId: "6afb4711045b02c31908ffee",
    nombre: "foto.png",
    tipo: "image/png",
    tamano: 68,
  },
  "6afb4711045b02c31908ffef"
);
assert.match(serializado.url, /\/archivo$/);
assert.equal(serializado.dataUrl, undefined);

assert.equal(calcularProgreso({ estado: "En proceso", pasos: [] }), 0);
assert.equal(calcularProgreso({ estado: "En proceso", pasos: [1] }), 10);
assert.equal(
  calcularProgreso({ estado: "En proceso", pasos: Array(10).fill(1) }),
  95
);
assert.equal(calcularProgreso({ estado: "Finalizado", pasos: [1] }), 100);

// Avance acumulado: manda el último paso que lo tenga.
assert.equal(
  calcularProgreso({ estado: "En proceso", pasos: [{ avance: 10 }, { avance: 40 }, { avance: 75 }] }),
  75
);
assert.equal(
  calcularProgreso({ estado: "En proceso", pasos: [{ avance: 30 }, { avance: null }] }),
  30
);
assert.equal(calcularProgreso({ estado: "En proceso", pasos: [{ avance: 0 }] }), 0);
assert.equal(calcularProgreso({ estado: "En proceso", pasos: [{ avance: 120 }] }), 100);
assert.equal(calcularProgreso({ estado: "En proceso", pasos: [{ avance: -5 }] }), 0);
assert.equal(
  calcularProgreso({ estado: "En proceso", pasos: [{ avance: 45.6 }] }),
  46
);

// Validación del avance.
assert.equal(normalizarAvance("45").valor, 45);
assert.equal(normalizarAvance(45.6).valor, 46);
assert.equal(normalizarAvance(0).valor, 0);
assert.ok(normalizarAvance(-1).error);
assert.ok(normalizarAvance(101).error);
assert.ok(normalizarAvance("abc").error);
assert.ok(normalizarAvance(undefined).error);

// El serializador recalcula el progreso al leer, aunque el valor guardado sea 0.
const equipoLegado = serializarEquipo({
  _id: "6afb4711045b02c31908fff1",
  placa: "1100481",
  estado: "Inactivo",
  motivoInactivo: "Mantenimiento",
  mantenimientos: [
    {
      _id: "6afb4711045b02c31908fff2",
      estado: "En proceso",
      progreso: 0,
      pasos: [
        { _id: "6afb4711045b02c31908fff3", texto: "Paso 1" },
        { _id: "6afb4711045b02c31908fff4", texto: "Paso 2" },
      ],
    },
  ],
});
assert.equal(equipoLegado.mantenimientos[0].progreso, 20);
assert.equal(equipoLegado.mantenimientos[0].pasos[0].avance, null);
assert.equal(equipoLegado.progresoMantenimiento, 20);

assert.equal(tieneMantenimientoEnProceso([]), false);
assert.equal(
  tieneMantenimientoEnProceso([{ estado: "Finalizado" }]),
  false
);
assert.equal(
  tieneMantenimientoEnProceso([
    { estado: "Finalizado" },
    { estado: "En proceso" },
  ]),
  true
);

console.log("equipmentMaintenance: todas las pruebas pasaron");
