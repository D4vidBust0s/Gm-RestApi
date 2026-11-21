import mongoose from "mongoose";

import User from "../models/User";
import { rolInventario } from "./requireInventoryAccess";
import { nombreUsuario } from "./requireGestor";

/**
 * Escrituras de Assignments: solo el almacén puede crear, aceptar, descargar
 * o anular custodias. El gestor de GM Citytv define el origin (Programmer/
 * Requirement), pero no ejecuta la carga/descarga.
 */
export const requireAlmacen = async (req, res, next) => {
  const id = req.headers["x-user-id"];

  if (!id || !mongoose.isValidObjectId(id)) {
    return res.status(401).json({
      message: "Debes iniciar sesión para gestionar las Assignments",
    });
  }

  try {
    const user = await User.findById(id).lean();

    if (!user || !user.activo) {
      return res.status(403).json({
        message: "El usuario no existe o está inactivo",
      });
    }

    if (rolInventario(user.rol) !== "almacen") {
      return res.status(403).json({
        message: "Solo el almacén puede gestionar las Assignments",
      });
    }

    req.usuario = {
      id: String(user._id),
      nombre: nombreUsuario(user),
      rol: user.rol,
      accesoInventario: "almacen",
    };

    next();
  } catch (err) {
    res.status(500).json({
      message: "No se pudo validar el usuario de la sesión",
    });
  }
};
