/*
  Pruebas de normalización/serialización del inventario y las reservas.
  Ejecutar en GM-RestApi con: npm run test:requirements
*/

import assert from "node:assert/strict";

import { normalizarLineaEquipo } from "./equipmentReservations";
import { serializarEquipo } from "./equipmentSerializer";

const linea = normalizarLineaEquipo({
  EquipoId: "abc",
  InventarioId: "123",
  Placa: "CAM-01",
  Restricciones: [{ texto: "Solo estudio" }, "No exterior"],
  RestriccionesAceptadasPor: "David",
});

assert.equal(linea.inventarioId, "123");
assert.equal(linea.placa, "CAM-01");
assert.deepEqual(linea.restricciones, ["Solo estudio", "No exterior"]);
assert.equal(linea.restriccionesAceptadasPor, "David");
assert.equal(linea.cantidad, 1);

const ahora = Date.now();
const imagenCategoria = {
  dataUrl: "data:image/png;base64,AAA",
  tipo: "image/png",
  actualizadaEn: new Date(ahora),
  nombre: "categoria.png",
};
const imagenSubcategoria = {
  dataUrl: "data:image/png;base64,BBB",
  tipo: "image/png",
  actualizadaEn: new Date(ahora),
  nombre: "subcategoria.png",
};

const equipo = {
  _id: "507f1f77bcf86cd799439011",
  placa: "CAM-01",
  categoriaId: { _id: "cat1", nombre: "Cámaras", imagen: imagenCategoria },
  subcategoriaId: {
    _id: "sub1",
    nombre: "Estudio",
    imagen: imagenSubcategoria,
  },
  ubicacionId: { nombre: "Bodega" },
  descripcion: "Cámara de prueba",
  estado: "Activo",
  observaciones: [],
  restricciones: [{ _id: "r1", texto: "Solo estudio" }],
  mantenimientos: [],
  hojaDeVida: [],
};

const serializado = serializarEquipo(equipo, {
  reservas: [
    {
      _id: "res1",
      origenTipo: "Programmer",
      origenCodigo: "REQ-2026-0001",
      inicio: new Date(ahora - 60 * 60 * 1000),
      fin: new Date(ahora + 60 * 60 * 1000),
      estado: "Activa",
    },
  ],
  custodia: {
    _id: "cust1",
    codigo: "ASG-2026-0001",
    estado: "Activa",
    trabajadorId: "worker1",
    trabajadorNombre: "David Bustos",
  },
  incluirHistorial: true,
});

assert.equal(serializado.subEstado, "Asignado");
assert.equal(serializado.imagen.tipo, "image/png");
assert.equal(serializado.imagen.nombre, "subcategoria.png");
assert.equal(serializado.imagen.origen, "subcategoria");
assert.match(serializado.imagen.url, /\/equipment\/507f1f77bcf86cd799439011\/imagen/);
assert.equal(serializado.subcategoria.nombre, "Estudio");
assert.equal(serializado.restricciones.length, 1);
assert.equal(serializado.reservasActivas.length, 1);
assert.equal(serializado.asignadoAhora, true);
assert.equal(serializado.estadoOperativo, "Asignado");
assert.equal(serializado.enCustodia, true);
assert.equal(serializado.custodia.codigo, "ASG-2026-0001");
assert.equal(serializado.custodia.trabajadorNombre, "David Bustos");

const soloCategoria = serializarEquipo(
  {
    ...equipo,
    subcategoriaId: { _id: "sub2", nombre: "Reportería", imagen: null },
  },
  { reservas: [] }
);
assert.equal(soloCategoria.imagen.nombre, "categoria.png");
assert.equal(soloCategoria.imagen.origen, "categoria");
assert.equal(soloCategoria.subEstado, "Disponible");

const sinImagen = serializarEquipo(
  {
    ...equipo,
    categoriaId: { _id: "cat2", nombre: "Audio", imagen: null },
    subcategoriaId: null,
  },
  { reservas: [] }
);
assert.equal(sinImagen.imagen, null);

console.log("equipmentReservations: todas las pruebas pasaron");
