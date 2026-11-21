/**
 * Resolución de las imágenes genéricas del inventario.
 *
 * No hay imágenes por equipo: cada equipo hereda la imagen de su subcategoría
 * o, si no tiene, la de su categoría. La imagen se sirve por endpoint para no
 * cargar data URLs en los listados.
 */

const texto = (valor) => String(valor ?? "").trim();

export const imagenDeEquipo = (equipo) => {
  const subcategoria = equipo?.subcategoriaId;
  const categoria = equipo?.categoriaId;

  if (subcategoria?.imagen?.dataUrl) {
    return {
      imagen: subcategoria.imagen,
      imagenMiniatura: subcategoria.imagenMiniatura ?? null,
      origen: "subcategoria",
    };
  }

  if (categoria?.imagen?.dataUrl) {
    return {
      imagen: categoria.imagen,
      imagenMiniatura: categoria.imagenMiniatura ?? null,
      origen: "categoria",
    };
  }

  return { imagen: null, imagenMiniatura: null, origen: null };
};

export const urlImagen = (basePath, id, size = "full", version = null) => {
  if (!id) return null;

  const query = new URLSearchParams({ size });
  if (version) query.set("v", new Date(version).getTime());

  return `${basePath}/${id}/imagen?${query.toString()}`;
};

export const metadataImagen = (
  imagen,
  { basePath, id, origen = null } = {}
) => {
  if (!imagen?.dataUrl) return null;

  return {
    tipo: texto(imagen.tipo),
    nombre: texto(imagen.nombre),
    actualizadaEn: imagen.actualizadaEn ?? null,
    url: urlImagen(basePath, id, "full", imagen.actualizadaEn),
    miniaturaUrl: urlImagen(basePath, id, "thumb", imagen.actualizadaEn),
    origen,
  };
};

export const metadataImagenEquipo = (equipo) => {
  const { imagen, origen } = imagenDeEquipo(equipo);

  return metadataImagen(imagen, {
    basePath: "/equipment",
    id: String(equipo?._id ?? equipo?.id ?? ""),
    origen,
  });
};
