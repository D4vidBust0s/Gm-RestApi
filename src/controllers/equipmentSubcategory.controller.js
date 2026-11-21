/*
  CRUD de subcategorías del inventario.
  Una subcategoría pertenece a una categoría y se puede desactivar, pero no
  cambiar de categoría si ya tiene equipos.
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

const serializar = async (subcategoria, categoriaNombre = "") => {
  const objeto =
    typeof subcategoria.toObject === "function"
      ? subcategoria.toObject()
      : subcategoria;
  const { imagen, imagenMiniatura, categoriaId, ...resto } = objeto;

  return {
    ...resto,
    categoria: {
      id: String(categoriaId?._id ?? categoriaId ?? ""),
      nombre: categoriaNombre,
    },
    uso: await Equipment.countDocuments({ subcategoriaId: objeto._id }),
    imagen: metadataImagen(imagen, {
      basePath: "/equipment-subcategories",
      id: String(objeto._id),
    }),
  };
};

const duplicado = async (categoriaId, nombre, excluirId = null) => {
  const query = {
    categoriaId,
    nombreClave: normalizarTexto(nombre),
  };
  if (excluirId) query._id = { $ne: excluirId };
  return EquipmentSubcategory.exists(query);
};

export const findAllSubcategories = async (req, res) => {
  try {
    const filtro = {};
    const categoriaId = texto(req.query.categoriaId);

    if (categoriaId) {
      if (!/^[a-f0-9]{24}$/i.test(categoriaId)) {
        return res.status(400).json({ message: "La categoría no es válida" });
      }
      filtro.categoriaId = categoriaId;
    }

    const subcategorias = await EquipmentSubcategory.find(filtro)
      .populate("categoriaId", "nombre")
      .sort({ orden: 1, nombre: 1 })
      .lean();

    res.json(
      await Promise.all(
        subcategorias.map((subcategoria) =>
          serializar(subcategoria, texto(subcategoria.categoriaId?.nombre))
        )
      )
    );
  } catch (error) {
    res.status(500).json({
      message: error?.message || "No se pudieron listar las subcategorías",
    });
  }
};

export const createSubcategory = async (req, res) => {
  const categoriaId = texto(req.body?.categoriaId);
  const nombre = texto(req.body?.nombre);
  const descripcion = texto(req.body?.descripcion);

  if (!categoriaId || !/^[a-f0-9]{24}$/i.test(categoriaId)) {
    return res.status(400).json({ message: "Selecciona una categoría válida" });
  }
  if (!nombre) {
    return res.status(400).json({ message: "El nombre es obligatorio" });
  }
  if (nombre.length > 60) {
    return res.status(400).json({ message: "El nombre no puede superar 60 caracteres" });
  }
  // La descripción técnica del equipo se hereda de aquí: es obligatoria.
  if (!descripcion) {
    return res.status(400).json({
      message: "La descripción técnica de la subcategoría es obligatoria",
    });
  }
  if (descripcion.length > 500) {
    return res
      .status(400)
      .json({ message: "La descripción no puede superar 500 caracteres" });
  }

  try {
    const categoria = await EquipmentCategory.findById(categoriaId).lean();
    if (!categoria) {
      return res.status(404).json({ message: "La categoría no existe" });
    }

    if (await duplicado(categoriaId, nombre)) {
      return res.status(409).json({
        message: "Ya existe una subcategoría con ese nombre en esta categoría",
      });
    }

    const imagen = normalizarImagen(req.body?.imagen);
    if (imagen.error) return res.status(400).json({ message: imagen.error });

    const miniatura = normalizarImagen(req.body?.imagenMiniatura, {
      maxBytes: MAX_BYTES_MINIATURA,
    });
    if (miniatura.error) return res.status(400).json({ message: miniatura.error });

    const ultimo = await EquipmentSubcategory.findOne({ categoriaId })
      .sort({ orden: -1 })
      .lean();
    const orden = Number(req.body?.orden);

    const subcategoria = await EquipmentSubcategory.create({
      categoriaId,
      nombre,
      nombreClave: normalizarTexto(nombre),
      descripcion,
      orden: Number.isFinite(orden) ? orden : Number(ultimo?.orden ?? 0) + 1,
      activo: req.body?.activo === undefined ? true : Boolean(req.body.activo),
      imagen: imagen.imagen ?? null,
      imagenMiniatura: miniatura.imagen ?? null,
    });

    broadcast("equipment-subcategories:changed", {
      action: "created",
      id: String(subcategoria._id),
      categoriaId,
    });

    res.status(201).json(await serializar(subcategoria, categoria.nombre));
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        message: "Ya existe una subcategoría con ese nombre en esta categoría",
      });
    }
    res.status(500).json({
      message: error?.message || "No se pudo crear la subcategoría",
    });
  }
};

export const updateSubcategory = async (req, res) => {
  const { id } = req.params;
  const nombre = texto(req.body?.nombre);

  if (!nombre) {
    return res.status(400).json({ message: "El nombre es obligatorio" });
  }

  try {
    const subcategoria = await EquipmentSubcategory.findById(id);
    if (!subcategoria) {
      return res.status(404).json({ message: "La subcategoría no existe" });
    }

    // Cambiar el nombre o la descripción afecta la descripción heredada de
    // todos sus equipos.
    const nombreAnterior = subcategoria.nombre;
    const descripcionAnterior = subcategoria.descripcion;
    const activoAnterior = subcategoria.activo;

    if (req.body?.categoriaId !== undefined) {
      if (String(req.body.categoriaId) !== String(subcategoria.categoriaId)) {
        return res.status(400).json({
          message: "La categoría de una subcategoría no se puede cambiar",
        });
      }
    }

    if (await duplicado(subcategoria.categoriaId, nombre, id)) {
      return res.status(409).json({
        message: "Ya existe una subcategoría con ese nombre en esta categoría",
      });
    }

    subcategoria.nombre = nombre;
    subcategoria.nombreClave = normalizarTexto(nombre);

    if (req.body?.descripcion !== undefined) {
      const descripcion = texto(req.body.descripcion);
      if (!descripcion) {
        return res.status(400).json({
          message: "La descripción técnica de la subcategoría es obligatoria",
        });
      }
      if (descripcion.length > 500) {
        return res
          .status(400)
          .json({ message: "La descripción no puede superar 500 caracteres" });
      }
      subcategoria.descripcion = descripcion;
    }
    if (req.body?.orden !== undefined) {
      const orden = Number(req.body.orden);
      if (Number.isFinite(orden)) subcategoria.orden = orden;
    }
    if (req.body?.activo !== undefined) {
      subcategoria.activo = Boolean(req.body.activo);
    }

    let imagenCambiada = false;
    if (req.body?.imagen !== undefined) {
      const imagen = normalizarImagen(req.body.imagen);
      if (imagen.error) return res.status(400).json({ message: imagen.error });

      if (!imagen.imagen) {
        subcategoria.imagen = null;
        subcategoria.imagenMiniatura = null;
      } else {
        subcategoria.imagen = imagen.imagen;
        const miniatura = normalizarImagen(req.body?.imagenMiniatura, {
          maxBytes: MAX_BYTES_MINIATURA,
        });
        if (miniatura.error) {
          return res.status(400).json({ message: miniatura.error });
        }
        subcategoria.imagenMiniatura = miniatura.imagen ?? null;
      }
      imagenCambiada = true;
    }

    await subcategoria.save();

    const categoria = await EquipmentCategory.findById(subcategoria.categoriaId)
      .select("nombre")
      .lean();

    const cambioVisible =
      nombre !== nombreAnterior ||
      texto(subcategoria.descripcion) !== texto(descripcionAnterior) ||
      Boolean(subcategoria.activo) !== Boolean(activoAnterior);

    broadcast("equipment-subcategories:changed", {
      action: "updated",
      id: String(subcategoria._id),
      categoriaId: String(subcategoria.categoriaId),
    });

    if (imagenCambiada || cambioVisible) {
      broadcast("equipment:changed", {
        action: cambioVisible ? "subcategory-updated" : "subcategory-image",
        id: String(subcategoria._id),
      });
    }

    res.json(await serializar(subcategoria, texto(categoria?.nombre)));
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        message: "Ya existe una subcategoría con ese nombre en esta categoría",
      });
    }
    res.status(500).json({
      message: error?.message || "No se pudo actualizar la subcategoría",
    });
  }
};

export const deleteSubcategory = async (req, res) => {
  const { id } = req.params;

  try {
    const subcategoria = await EquipmentSubcategory.findById(id);
    if (!subcategoria) {
      return res.status(404).json({ message: "La subcategoría no existe" });
    }

    const uso = await Equipment.countDocuments({ subcategoriaId: subcategoria._id });
    if (uso > 0) {
      return res.status(409).json({
        message: `La subcategoría "${subcategoria.nombre}" tiene ${uso} equipo(s). Desactívala en lugar de eliminarla.`,
      });
    }

    await EquipmentSubcategory.findByIdAndDelete(id);

    broadcast("equipment-subcategories:changed", {
      action: "deleted",
      id: String(subcategoria._id),
      categoriaId: String(subcategoria.categoriaId),
    });

    res.json({ message: `Subcategoría "${subcategoria.nombre}" eliminada` });
  } catch (error) {
    res.status(500).json({
      message: error?.message || "No se pudo eliminar la subcategoría",
    });
  }
};

export const getSubcategoryImage = async (req, res) => {
  try {
    const subcategoria = await EquipmentSubcategory.findById(req.params.id).select(
      "imagen imagenMiniatura"
    );
    if (!subcategoria) {
      return res.status(404).json({ message: "La subcategoría no existe" });
    }

    const size = String(req.query.size ?? "full").toLowerCase();
    const imagen =
      size === "thumb"
        ? subcategoria.imagenMiniatura ?? subcategoria.imagen
        : subcategoria.imagen ?? subcategoria.imagenMiniatura;

    const archivo = imagenABuffer(imagen);
    if (!archivo) {
      return res.status(404).json({ message: "La subcategoría no tiene imagen" });
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

export const deleteSubcategoryImage = async (req, res) => {
  try {
    const subcategoria = await EquipmentSubcategory.findById(req.params.id);
    if (!subcategoria) {
      return res.status(404).json({ message: "La subcategoría no existe" });
    }

    if (!subcategoria.imagen?.dataUrl && !subcategoria.imagenMiniatura?.dataUrl) {
      return res.status(404).json({ message: "La subcategoría no tiene imagen" });
    }

    subcategoria.imagen = null;
    subcategoria.imagenMiniatura = null;
    await subcategoria.save();

    broadcast("equipment-subcategories:changed", {
      action: "image-deleted",
      id: String(subcategoria._id),
      categoriaId: String(subcategoria.categoriaId),
    });
    broadcast("equipment:changed", {
      action: "subcategory-image",
      id: String(subcategoria._id),
    });

    res.json({ message: "Imagen de la subcategoría eliminada" });
  } catch (error) {
    res.status(500).json({
      message: error?.message || "No se pudo eliminar la imagen",
    });
  }
};
