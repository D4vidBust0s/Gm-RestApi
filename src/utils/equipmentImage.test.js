/*
  Pruebas de validación de imágenes del inventario.
  Ejecutar en GM-RestApi con: npm run test:equipment
*/

import assert from "node:assert/strict";

import { imagenABuffer, normalizarImagen } from "./equipmentImage";

const png =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z2ZkAAAAASUVORK5CYII=";

const valida = normalizarImagen({ dataUrl: png, nombre: "camara.png" });
assert.equal(valida.error, null);
assert.equal(valida.imagen.tipo, "image/png");
assert.equal(valida.imagen.nombre, "camara.png");

const invalida = normalizarImagen({ dataUrl: "data:text/plain;base64,SG9sYQ==" });
assert.ok(invalida.error);

const vacia = normalizarImagen(null);
assert.equal(vacia.imagen, null);

const archivo = imagenABuffer(valida.imagen);
assert.ok(archivo.buffer.length > 0);
assert.equal(archivo.tipo, "image/png");

console.log("equipmentImage: todas las pruebas pasaron");
