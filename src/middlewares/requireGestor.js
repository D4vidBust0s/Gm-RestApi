import mongoose from "mongoose";

import User from "../models/User";

/**
 * Restricción de operaciones de gestión para Programmer y departamentos.
 *
 * La aplicación todavía no emite tokens firmados; la identidad se toma del
 * header x-user-id que el frontend llena con la sesión de localStorage. El
 * backend vuelve a consultar el usuario y su rol en la base de datos, de modo
 * que un rol inventado en el header no sirve.
 */

const ROLES_GESTORES = new Set([
  "administrador",
  "admin",
  "superadmin",
  "ingeniero",
  "coordinador",
  "jefe",
]);

const normalizar = (valor) =>
  String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

export const nombreUsuario = (user) =>
  `${user?.nombres ?? ""} ${user?.apellidos ?? ""}`.trim() ||
  user?.usuario ||
  "Administrador";

export const requireGestor = async (req, res, next) => {
  const id = req.headers["x-user-id"];

  if (!id || !mongoose.isValidObjectId(id)) {
    return res.status(401).json({
      message: "Debes iniciar sesión para gestionar requerimientos",
    });
  }

  try {
    const user = await User.findById(id).lean();

    if (!user || !user.activo) {
      return res.status(403).json({
        message: "El usuario no existe o está inactivo",
      });
    }

    if (!ROLES_GESTORES.has(normalizar(user.rol))) {
      return res.status(403).json({
        message: "Tu rol no tiene permiso para gestionar requerimientos",
      });
    }

    req.usuario = {
      id: String(user._id),
      nombre: nombreUsuario(user),
      rol: user.rol,
    };

    next();
  } catch (error) {
    res.status(500).json({
      message: "No se pudo validar el usuario de la sesión",
    });
  }
};
