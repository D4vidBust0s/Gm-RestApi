import assert from "node:assert/strict";

import { serializarCustodia, serializarIncidente } from "./assignmentSerializer";

const custodia = {
  _id: "507f1f77bcf86cd799439011",
  codigo: "ASG-2026-0001",
  origenTipo: "Requirement",
  origenId: "507f1f77bcf86cd799439012",
  origenCodigo: "REQ-2026-0001",
  origenNombre: "Concierto",
  origenEstado: "Agendado",
  trabajadorId: "worker1",
  trabajadorNombre: "David Bustos",
  trabajadorCargo: "Camarógrafo",
  estado: "Pendiente",
  activa: true,
  equipos: [
    {
      _id: "item1",
      equipoId: "507f1f77bcf86cd799439013",
      placaSnapshot: "CAM-01",
      estado: "Pendiente",
    },
  ],
  aceptacion: {
    metodo: "temporal",
    estado: "Pendiente",
    intentos: 0,
    bloqueada: false,
  },
  creadaPor: "Almacén",
  creadaPorId: "u1",
  creadaEn: new Date(),
  historial: [
    {
      tipo: "creacion",
      detalle: "Assignment creada",
      por: "Almacén",
      el: new Date(),
    },
  ],
};

const serializada = serializarCustodia(custodia, { incluirHistorial: true });
assert.equal(serializada.codigo, "ASG-2026-0001");
assert.equal(serializada.trabajador.nombre, "David Bustos");
assert.equal(serializada.equipos[0].placa, "CAM-01");
assert.equal(serializada.aceptacion.metodo, "temporal");
assert.equal(serializada.historial.length, 1);
assert.equal("codigoAprobacion" in serializada, false);
assert.equal("pin" in serializada, false);

const conImagen = serializarCustodia(custodia, {
  imagenesPorEquipo: new Map([
    ["507f1f77bcf86cd799439013", { miniaturaUrl: "/equipment/x/imagen?size=thumb" }],
  ]),
});
assert.equal(
  conImagen.equipos[0].imagen.miniaturaUrl,
  "/equipment/x/imagen?size=thumb"
);

const incidente = serializarIncidente({
  _id: "507f1f77bcf86cd799439014",
  equipoId: "507f1f77bcf86cd799439013",
  placaSnapshot: "CAM-01",
  tipo: "Daño",
  descripcion: "Pantalla rota",
  estado: "Abierto",
  notas: [],
  resolucion: {},
});
assert.equal(incidente.placa, "CAM-01");
assert.equal(incidente.estado, "Abierto");

console.log("assignmentSerializer: todas las pruebas pasaron");
