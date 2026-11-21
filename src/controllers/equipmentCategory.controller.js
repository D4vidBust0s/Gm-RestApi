/*
  CRUD de categorías del inventario.
  No se elimina una categoría en uso: se desactiva.
*/

import Equipment from "../models/Equipment";
import EquipmentCategory from "../models/EquipmentCategory";
import EquipmentSubcategory from "../models/EquipmentSubcategory";
import { broadcast } from "../realtime";
import { normalizarTexto } from "../utils/equipmentRules";
import {
  imagenABuffer,
  MAX_BYTES_MINIATURA,
  normalizarImagen,
} from "../utils/equipmentImage";
import { metadataImagen } from "../utils/equipmentImages";

const texto = (valor) => String(valor ?? "").trim();

const conUso = async (categorias) =>
  Promise.all(
    categorias.map(async (categoria) => {
      const { imagen, imagenMiniatura, ...resto } = categoria;

      return {
        ...resto,
        uso: await Equipment.countDocuments({ categoriaId: categoria._id }),
        subcategorias: await EquipmentSubcategory.countDocuments({
          categoriaId: categoria._id,
        }),
        imagen: metadataImagen(imagen, {
          basePath: "/equipment-categories",
          id: String(categoria._id),
        }),
      };
    })
  );

const duplicado = async (nombre, excluirId = null) => {
  const query = { nombreClave: normalizarTexto(nombre) };
  if (excluirId) query._id = { $ne: excluirId };
  return EquipmentCategory.exists(query);
};

export const findAllCategories = async (req, res) => {
  try {
    const categorias = await EquipmentCategory.find()
      .sort({ orden: 1, nombre: 1 })
      .lean();

    res.json(await conUso(categorias));
  } catch (error) {
    res.status(500).json({
      message: error?.message || "No se pudieron listar las categorías",
    });
  }
};

export const createCategory = async (req, res) => {
  const nombre = texto(req.body?.nombre);
  const descripcion = texto(req.body?.descripcion);

  if (!nombre) {
    return res.status(400).json({ message: "El nombre es obligatorio" });
  }
  if (nombre.length > 60) {
    return res.status(400).json({ message: "El nombre no puede superar 60 caracteres" });
  }

  try {
    if (await duplicado(nombre)) {
      return res.status(409).json({
        message: "Ya existe una categoría con ese nombre",
      });
    }

    const imagen = normalizarImagen(req.body?.imagen);
    if (imagen.error) return res.status(400).json({ message: imagen.error });

    const miniatura = normalizarImagen(req.body?.imagenMiniatura, {
      maxBytes: MAX_BYTES_MINIATURA,
    });
    if (miniatura.error) return res.status(400).json({ message: miniatura.error });

    const ultimo = await EquipmentCategory.findOne().sort({ orden: -1 }).lean();
    const orden = Number(req.body?.orden);

    const categoria = await EquipmentCategory.create({
      nombre,
      nombreClave: normalizarTexto(nombre),
      descripcion,
      orden: Number.isFinite(orden) ? orden : Number(ultimo?.orden ?? 0) + 1,
      activo: req.body?.activo === undefined ? true : Boolean(req.body.activo),
      imagen: imagen.imagen ?? null,
      imagenMiniatura: miniatura.imagen ?? null,
    });

    broadcast("equipment-categories:changed", {
      action: "created",
      id: String(categoria._id),
    });

    const { imagen: imagenCreada, imagenMiniatura: miniCreada, ...restoCreada } =
      categoria.toObject();

    res.status(201).json({
      ...restoCreada,
      uso: 0,
      subcategorias: 0,
      imagen: metadataImagen(imagenCreada, {
        basePath: "/equipment-categories",
        id: String(categoria._id),
      }),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        message: "Ya existe una categoría con ese nombre",
      });
    }
    res.status(500).json({
      message: error?.message || "No se pudo crear la categoría",
    });
  }
};

export const updateCategory = async (req, res) => {
  const { id } = req.params;
  const nombre = texto(req.body?.nombre);

  if (!nombre) {
    return res.status(400).json({ message: "El nombre es obligatorio" });
  }

  try {
    const categoria = await EquipmentCategory.findById(id);
    if (!categoria) {
      return res.status(404).json({ message: "La categoría no existe" });
    }

    // La descripción de la categoría se hereda a los equipos que no tienen
    // subcategoría, así que un cambio de texto también afecta al inventario.
    const nombreAnterior = categoria.nombre;
    const descripcionAnterior = categoria.descripcion;
    const activoAnterior = categoria.activo;

    if (await duplicado(nombre, id)) {
      return res.status(409).json({
        message: "Ya existe una categoría con ese nombre",
      });
    }

    categoria.nombre = nombre;
    categoria.nombreClave = normalizarTexto(nombre);

    if (req.body?.descripcion !== undefined) {
      categoria.descripcion = texto(req.body.descripcion);
    }
    if (req.body?.orden !== undefined) {
      const orden = Number(req.body.orden);
      if (Number.isFinite(orden)) categoria.orden = orden;
    }
    if (req.body?.activo !== undefined) {
      categoria.activo = Boolean(req.body.activo);
    }

    let imagenCambiada = false;
    if (req.body?.imagen !== undefined) {
      const imagen = normalizarImagen(req.body.imagen);
      if (imagen.error) return res.status(400).json({ message: imagen.error });

      if (!imagen.imagen) {
        categoria.imagen = null;
        categoria.imagenMiniatura = null;
      } else {
        categoria.imagen = imagen.imagen;
        const miniatura = normalizarImagen(req.body?.imagenMiniatura, {
          maxBytes: MAX_BYTES_MINIATURA,
        });
        if (miniatura.error) {
          return res.status(400).json({ message: miniatura.error });
        }
        categoria.imagenMiniatura = miniatura.imagen ?? null;
      }
      imagenCambiada = true;
    }

    await categoria.save();

    const cambioVisible =
      nombre !== nombreAnterior ||
      texto(categoria.descripcion) !== texto(descripcionAnterior) ||
      Boolean(categoria.activo) !== Boolean(activoAnterior);

    broadcast("equipment-categories:changed", {
      action: "updated",
      id: String(categoria._id),
    });

    if (imagenCambiada || cambioVisible) {
      broadcast("equipment:changed", {
        action: cambioVisible ? "category-updated" : "category-image",
        id: String(categoria._id),
      });
    }

    const { imagen, imagenMiniatura, ...resto } = categoria.toObject();

    res.json({
      ...resto,
      uso: await Equipment.countDocuments({ categoriaId: categoria._id }),
      subcategorias: await EquipmentSubcategory.countDocuments({
        categoriaId: categoria._id,
      }),
      imagen: metadataImagen(imagen, {
        basePath: "/equipment-categories",
        id: String(categoria._id),
      }),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        message: "Ya existe una categoría con ese nombre",
      });
    }
    res.status(500).json({
      message: error?.message || "No se pudo actualizar la categoría",
    });
  }
};

export const deleteCategory = async (req, res) => {
  const { id } = req.params;

  try {
    const categoria = await EquipmentCategory.findById(id);
    if (!categoria) {
      return res.status(404).json({ message: "La categoría no existe" });
    }

    const uso = await Equipment.countDocuments({ categoriaId: categoria._id });
    if (uso > 0) {
      return res.status(409).json({
        message: `La categoría "${categoria.nombre}" tiene ${uso} equipo(s). Desactívala en lugar de eliminarla.`,
      });
    }

    const subcategorias = await EquipmentSubcategory.countDocuments({
      categoriaId: categoria._id,
    });
    if (subcategorias > 0) {
      return res.status(409).json({
        message: `La categoría "${categoria.nombre}" tiene ${subcategorias} subcategoría(s). Elimínalas o desactívalas primero.`,
      });
    }

    await EquipmentCategory.findByIdAndDelete(id);

    broadcast("equipment-categories:changed", {
      action: "deleted",
      id: String(categoria._id),
    });

    res.json({ message: `Categoría "${categoria.nombre}" eliminada` });
  } catch (error) {
    res.status(500).json({
      message: error?.message || "No se pudo eliminar la categoría",
    });
  }
};

export const getCategoryImage = async (req, res) => {
  try {
    const categoria = await EquipmentCategory.findById(req.params.id).select(
      "imagen imagenMiniatura"
    );
    if (!categoria) {
      return res.status(404).json({ message: "La categoría no existe" });
    }

    const size = String(req.query.size ?? "full").toLowerCase();
    const imagen =
      size === "thumb"
        ? categoria.imagenMiniatura ?? categoria.imagen
        : categoria.imagen ?? categoria.imagenMiniatura;

    const archivo = imagenABuffer(imagen);
    if (!archivo) {
      return res.status(404).json({ message: "La categoría no tiene imagen" });
    }

    res.set("Content-Type", archivo.tipo);
    res.set("Cache-Control", "public, max-age=3600");
    res.send(archivo.buffer);
  } catch (error) {
    res.status(500).json({
      message: error?.message || "No se pudo obtener la imagen",
    });
  }
};

export const deleteCategoryImage = async (req, res) => {
  try {
    const categoria = await EquipmentCategory.findById(req.params.id);
    if (!categoria) {
      return res.status(404).json({ message: "La categoría no existe" });
    }

    if (!categoria.imagen?.dataUrl && !categoria.imagenMiniatura?.dataUrl) {
      return res.status(404).json({ message: "La categoría no tiene imagen" });
    }

    categoria.imagen = null;
    categoria.imagenMiniatura = null;
    await categoria.save();

    broadcast("equipment-categories:changed", {
      action: "image-deleted",
      id: String(categoria._id),
    });
    broadcast("equipment:changed", {
      action: "category-image",
      id: String(categoria._id),
    });

    res.json({ message: "Imagen de la categoría eliminada" });
  } catch (error) {
    res.status(500).json({
      message: error?.message || "No se pudo eliminar la imagen",
    });
  }
};
