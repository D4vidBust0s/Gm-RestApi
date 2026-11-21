import mongoose from "mongoose";

import User from "../models/User";
import { nombreUsuario } from "./requireGestor";

/**
 * Acceso de escritura al inventario de GM-Activos.
 *
 * El almacén es el dueño natural del inventario, pero el administrador/gestor
 * de GM Citytv también puede consultar y registrar observaciones. El backend
 * vuelve a consultar el usuario: el header no es una credencial firmada.
 */

const ROLES_ALMACEN = new Set(["almacenista", "almaceneista"]);

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

export const rolInventario = (rol) => {
  const valor = normalizar(rol);
  if (ROLES_ALMACEN.has(valor)) return "almacen";
  if (ROLES_GESTORES.has(valor)) return "gestor";
  return null;
};

export const requireInventoryAccess = async (req, res, next) => {
  const id = req.headers["x-user-id"];

  if (!id || !mongoose.isValidObjectId(id)) {
    return res.status(401).json({
      message: "Debes iniciar sesión para gestionar el inventario",
    });
  }

  try {
    const user = await User.findById(id).lean();

    if (!user || !user.activo) {
      return res.status(403).json({
        message: "El usuario no existe o está inactivo",
      });
    }

    const acceso = rolInventario(user.rol);
    if (!acceso) {
      return res.status(403).json({
        message: "Tu rol no tiene permiso para gestionar el inventario",
      });
    }

    req.usuario = {
      id: String(user._id),
      nombre: nombreUsuario(user),
      rol: user.rol,
      accesoInventario: acceso,
    };

    next();
  } catch (error) {
    res.status(500).json({
      message: "No se pudo validar el usuario de la sesión",
    });
  }
};
