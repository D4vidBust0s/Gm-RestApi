/*
  CRUD de ubicaciones del inventario.
  No se elimina una ubicación en uso: se desactiva.
*/

import Equipment from "../models/Equipment";
import EquipmentLocation from "../models/EquipmentLocation";
import { broadcast } from "../realtime";
import { normalizarTexto } from "../utils/equipmentRules";

const texto = (valor) => String(valor ?? "").trim();

const conUso = async (ubicaciones) =>
  Promise.all(
    ubicaciones.map(async (ubicacion) => ({
      ...ubicacion,
      uso: await Equipment.countDocuments({ ubicacionId: ubicacion._id }),
    }))
  );

const duplicado = async (nombre, excluirId = null) => {
  const query = { nombreClave: normalizarTexto(nombre) };
  if (excluirId) query._id = { $ne: excluirId };
  return EquipmentLocation.exists(query);
};

export const findAllLocations = async (req, res) => {
  try {
    const ubicaciones = await EquipmentLocation.find()
      .sort({ orden: 1, nombre: 1 })
      .lean();

    res.json(await conUso(ubicaciones));
  } catch (error) {
    res.status(500).json({
      message: error?.message || "No se pudieron listar las ubicaciones",
    });
  }
};

export const createLocation = async (req, res) => {
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
        message: "Ya existe una ubicación con ese nombre",
      });
    }

    const ultimo = await EquipmentLocation.findOne().sort({ orden: -1 }).lean();
    const orden = Number(req.body?.orden);

    const ubicacion = await EquipmentLocation.create({
      nombre,
      nombreClave: normalizarTexto(nombre),
      descripcion,
      orden: Number.isFinite(orden) ? orden : Number(ultimo?.orden ?? 0) + 1,
      activo: req.body?.activo === undefined ? true : Boolean(req.body.activo),
    });

    broadcast("equipment-locations:changed", {
      action: "created",
      id: String(ubicacion._id),
    });

    res.status(201).json({ ...ubicacion.toObject(), uso: 0 });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        message: "Ya existe una ubicación con ese nombre",
      });
    }
    res.status(500).json({
      message: error?.message || "No se pudo crear la ubicación",
    });
  }
};

export const updateLocation = async (req, res) => {
  const { id } = req.params;
  const nombre = texto(req.body?.nombre);

  if (!nombre) {
    return res.status(400).json({ message: "El nombre es obligatorio" });
  }

  try {
    const ubicacion = await EquipmentLocation.findById(id);
    if (!ubicacion) {
      return res.status(404).json({ message: "La ubicación no existe" });
    }

    if (await duplicado(nombre, id)) {
      return res.status(409).json({
        message: "Ya existe una ubicación con ese nombre",
      });
    }

    ubicacion.nombre = nombre;
    ubicacion.nombreClave = normalizarTexto(nombre);

    if (req.body?.descripcion !== undefined) {
      ubicacion.descripcion = texto(req.body.descripcion);
    }
    if (req.body?.orden !== undefined) {
      const orden = Number(req.body.orden);
      if (Number.isFinite(orden)) ubicacion.orden = orden;
    }
    if (req.body?.activo !== undefined) {
      ubicacion.activo = Boolean(req.body.activo);
    }

    await ubicacion.save();

    broadcast("equipment-locations:changed", {
      action: "updated",
      id: String(ubicacion._id),
    });

    res.json({
      ...ubicacion.toObject(),
      uso: await Equipment.countDocuments({ ubicacionId: ubicacion._id }),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        message: "Ya existe una ubicación con ese nombre",
      });
    }
    res.status(500).json({
      message: error?.message || "No se pudo actualizar la ubicación",
    });
  }
};

export const deleteLocation = async (req, res) => {
  const { id } = req.params;

  try {
    const ubicacion = await EquipmentLocation.findById(id);
    if (!ubicacion) {
      return res.status(404).json({ message: "La ubicación no existe" });
    }

    const uso = await Equipment.countDocuments({ ubicacionId: ubicacion._id });
    if (uso > 0) {
      return res.status(409).json({
        message: `La ubicación "${ubicacion.nombre}" tiene ${uso} equipo(s). Desactívala en lugar de eliminarla.`,
      });
    }

    await EquipmentLocation.findByIdAndDelete(id);

    broadcast("equipment-locations:changed", {
      action: "deleted",
      id: String(ubicacion._id),
    });

    res.json({ message: `Ubicación "${ubicacion.nombre}" eliminada` });
  } catch (error) {
    res.status(500).json({
      message: error?.message || "No se pudo eliminar la ubicación",
    });
  }
};
