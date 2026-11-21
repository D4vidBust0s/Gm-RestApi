import User from "../models/User";
import { broadcast, RT_EVENTS } from "../realtime";

export const loginUser = async (req, res) => {
  const { usuario, password } = req.body;

  try {
    const userFound = await User.findOne({ usuario });
    if (!userFound) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Validación simple de contraseña (o usando bcrypt si lo prefieres)
    if (userFound.password !== password) {
      return res.status(401).json({ message: "Contraseña incorrecta" });
    }

    if (!userFound.activo) {
      return res.status(403).json({ message: "El usuario está inactivo" });
    }

    res.json({
      message: "Login exitoso",
      user: {
        id: userFound._id,
        nombres: userFound.nombres,
        apellidos: userFound.apellidos,
        rol: userFound.rol,
        imagen: userFound.imagen,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Error en el servidor" });
  }
};

// FUNCIÓN ACTUALIZADA PARA VALIDAR CONTRASEÑA ACTUAL Y ACTUALIZAR ROL
export const updateUser = async (req, res) => {
  const { id } = req.params;
  const { nombres, apellidos, currentPassword, newPassword, rol, imagen } = req.body;

  try {
    const userFound = await User.findById(id);
    if (!userFound) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // 1. Validar cambio de contraseña si el usuario ingresó una nueva
    if (newPassword && newPassword.trim() !== "") {
      if (!currentPassword) {
        return res.status(400).json({ message: "Debes ingresar tu contraseña actual para cambiarla" });
      }

      if (userFound.password !== currentPassword) {
        return res.status(401).json({ message: "La contraseña actual es incorrecta" });
      }

      userFound.password = newPassword;
    }

    // 2. Actualizar el resto de los campos
    if (nombres) userFound.nombres = nombres;
    if (apellidos) userFound.apellidos = apellidos;
    if (rol) userFound.rol = rol;
    if (imagen !== undefined) userFound.imagen = imagen;

    await userFound.save();

    const usuarioActualizado = {
      id: userFound._id,
      usuario: userFound.usuario,
      nombres: userFound.nombres,
      apellidos: userFound.apellidos,
      rol: userFound.rol,
      imagen: userFound.imagen,
    };

    // Avisa a todas las sesiones conectadas (chat y demás listas de usuarios)
    broadcast(RT_EVENTS.USER_UPDATED, usuarioActualizado);

    res.json({
      message: "Perfil actualizado exitosamente",
      user: usuarioActualizado,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Error en el servidor" });
  }
};



export const getUsers = async (req, res) => {
  try {
    // Buscamos todos los usuarios y excluimos la contraseña por seguridad
    const users = await User.find({}, "-password");
    res.status(200).json(users);
  } catch (error) {
    console.error("Error al obtener los usuarios:", error);
    res.status(500).json({ message: "Error al obtener la lista de usuarios" });
  }
};