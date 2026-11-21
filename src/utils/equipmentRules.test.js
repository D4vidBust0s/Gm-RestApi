/*
  Pruebas de las reglas puras del inventario.
  Ejecutar en GM-RestApi con: npm run test:equipment
*/

import assert from "node:assert/strict";

import {
  construirResumenDisponibilidad,
  descripcionEquipo,
  estadoVisible,
  normalizarPlaca,
  restriccionesPendientes,
  validarEstadoCreacion,
  validarTransicionEstado,
} from "./equipmentRules";

assert.equal(normalizarPlaca("  CAM-001  "), "cam-001");
assert.equal(normalizarPlaca("Cámara 01"), "camara 01");

const creacion = validarEstadoCreacion({ estado: "Inactivo", motivoInactivo: "Protegido" });
assert.equal(creacion.ok, true);

assert.equal(
  validarEstadoCreacion({ estado: "Inactivo", motivoInactivo: "Mantenimiento" }).ok,
  false,
  "El mantenimiento no se crea por cambio de estado"
);

assert.equal(
  validarTransicionEstado({
    estadoActual: "Activo",
    estadoNuevo: "Inactivo",
    motivoNuevo: "Mantenimiento",
  }).ok,
  false,
  "El mantenimiento no se inicia desde cambio de estado"
);

assert.equal(
  validarTransicionEstado({
    estadoActual: "Inactivo",
    motivoActual: "Mantenimiento",
    estadoNuevo: "Activo",
  }).ok,
  false,
  "El mantenimiento no se cierra desde cambio de estado"
);
assert.equal(creacion.motivoInactivo, "Protegido");

assert.equal(
  validarEstadoCreacion({ estado: "Inactivo", motivoInactivo: "Baja" }).ok,
  false,
  "Un equipo nuevo no puede nacer dado de baja"
);

assert.equal(
  validarTransicionEstado({
    estadoActual: "Inactivo",
    motivoActual: "Protegido",
    estadoNuevo: "Activo",
  }).ok,
  true
);

assert.equal(
  validarTransicionEstado({
    estadoActual: "Inactivo",
    motivoActual: "Baja",
    estadoNuevo: "Activo",
  }).ok,
  false,
  "La baja es terminal"
);

assert.equal(
  validarTransicionEstado({
    estadoActual: "Activo",
    estadoNuevo: "Inactivo",
    motivoNuevo: "Mantenimiento",
    tieneReservas: true,
  }).ok,
  false,
  "No se puede inactivar con reservas activas"
);

assert.equal(
  estadoVisible({ estado: "Activo", tieneReservaVigente: true }),
  "Asignado"
);
assert.equal(
  estadoVisible({ estado: "Activo", tieneCustodiaActiva: true }),
  "Asignado",
  "La custodia de una Assignment también muestra Asignado"
);
assert.equal(
  estadoVisible({ estado: "Inactivo", motivoInactivo: "Mantenimiento" }),
  "Mantenimiento"
);
assert.equal(
  estadoVisible({ estado: "Inactivo", motivoInactivo: "Novedad" }),
  "Novedad"
);
assert.equal(
  validarTransicionEstado({
    estadoActual: "Activo",
    estadoNuevo: "Inactivo",
    motivoNuevo: "Novedad",
  }).ok,
  false,
  "Novedad solo la asigna Assignments"
);
assert.equal(
  validarTransicionEstado({
    estadoActual: "Inactivo",
    motivoActual: "Novedad",
    estadoNuevo: "Activo",
  }).ok,
  false,
  "Novedad se cierra desde Assignments → Cases"
);

const equipos = [
  { _id: "1", estado: "Activo" },
  { _id: "2", estado: "Activo" },
  { _id: "3", estado: "Inactivo", motivoInactivo: "Protegido" },
  { _id: "4", estado: "Inactivo", motivoInactivo: "Baja" },
  { _id: "5", estado: "Activo" },
];

const { resumen, disponibles } = construirResumenDisponibilidad({
  equipos,
  reservados: new Set(["2"]),
  enCustodia: new Set(["5"]),
});

assert.equal(resumen.total, 5);
assert.equal(resumen.inactivos, 2);
assert.equal(resumen.reservadosEnFranja, 1);
assert.equal(resumen.asignadosEnCustodia, 1);
assert.equal(resumen.disponibles, 1);
assert.equal(disponibles.length, 1);

const pendientes = restriccionesPendientes({
  equipos: [
    { _id: "a", placa: "CAM-1", restricciones: ["Solo estudio"] },
    { _id: "b", placa: "CAM-2", restricciones: [] },
  ],
});
assert.equal(pendientes.length, 1);
assert.equal(pendientes[0].placa, "CAM-1");

assert.equal(
  restriccionesPendientes({
    equipos: [{ _id: "a", placa: "CAM-1", restricciones: ["Solo estudio"], restriccionesAceptadasPor: "David" }],
  }).length,
  0
);

/* Descripción técnica heredada: subcategoría → categoría → texto legado. */
assert.equal(
  descripcionEquipo({
    descripcion: "Texto legado",
    categoriaId: { nombre: "Iluminación", descripcion: "Luces del estudio" },
    subcategoriaId: { nombre: "Luces Forza", descripcion: "Luces Forza FX" },
  }),
  "Luces Forza FX",
  "La subcategoría manda sobre la categoría y el texto legado"
);

assert.equal(
  descripcionEquipo({
    descripcion: "Texto legado",
    categoriaId: { nombre: "Iluminación", descripcion: "Luces del estudio" },
    subcategoriaId: { nombre: "Sin descripción", descripcion: "" },
  }),
  "Luces del estudio",
  "Sin descripción de subcategoría se hereda la de la categoría"
);

assert.equal(
  descripcionEquipo({
    descripcion: "Texto legado",
    categoriaId: { nombre: "Iluminación", descripcion: "" },
  }),
  "Texto legado",
  "Sin catálogo se respeta el texto legado del equipo"
);

assert.equal(
  descripcionEquipo({ categoriaId: "64b7f0c2a1b2c3d4e5f60718", subcategoriaId: null }),
  "",
  "Los ids sin popular no rompen la regla"
);

assert.equal(descripcionEquipo(null), "");

console.log("equipmentRules: todas las pruebas pasaron");
