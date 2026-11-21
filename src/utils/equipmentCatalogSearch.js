/*
  Búsqueda de equipos por texto de catálogo.

  La descripción técnica de un equipo se hereda de su subcategoría (o de su
  categoría), así que el buscador debe encontrar los equipos cuyo catálogo
  coincide con el texto aunque el equipo no guarde ese texto.
*/

import EquipmentCategory from "../models/EquipmentCategory";
import EquipmentSubcategory from "../models/EquipmentSubcategory";

const escaparRegex = (valor) =>
  String(valor ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Resuelve el patrón de búsqueda y los catálogos que coinciden por nombre o
 * descripción. Devuelve `null` si no hay término que buscar.
 */
export const catalogosPorTexto = async (busqueda) => {
  const termino = String(busqueda ?? "").trim();
  if (!termino) return null;

  const patron = new RegExp(escaparRegex(termino), "i");

  const [subcategorias, categorias] = await Promise.all([
    EquipmentSubcategory.find({
      $or: [{ nombre: patron }, { descripcion: patron }],
    })
      .select("_id")
      .lean(),
    EquipmentCategory.find({
      $or: [{ nombre: patron }, { descripcion: patron }],
    })
      .select("_id")
      .lean(),
  ]);

  return {
    patron,
    idsSubcategoria: subcategorias.map((item) => item._id),
    idsCategoria: categorias.map((item) => item._id),
  };
};
