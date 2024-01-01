/*
  Archivo con la logica y ejecución de todos los procesos que interactuan con
  la base de datos con respecto a los grupos
*/

import Group from "../models/Groups";

//Crear un nuevo grupo
export const createGroup = async (req, res) => {
  //validacion
  if (!req.body.nombre || !req.body.logo || !req.body.descripcion) {
    return res.status(400).send({
      message:
        "No se han enviado los parametros correctos o alguno de ellos esta vacio",
    });
  }

  try {
    const newGroup = new Group({
      nombre: req.body.nombre,
      logo: req.body.logo,
      descripcion: req.body.descripcion,
    });

    const groupSaved = await newGroup.save();
    res.json(groupSaved);
  } catch (error) {
    res.status(500).json({
      message: error.message || "Error intentando crear el grupo",
    });
  }
};

//Listar todas los grupos
export const findAllGroups = async (req, res) => {
  try {
    const group = await Group.find();
    res.json(group);
  } catch (error) {
    res.status(500).json({
      message: "error intentando listar los grupos",
    });
  }
};

//Listar un Grupo por id
export const findOneGroup = async (req, res) => {
  const { id } = req.params;

  try {
    const oneGroup = await Group.findById(id);

    if (!oneGroup)
      return res.status(404).json({
        message: `El grupo con id ${id} no existe`,
      });
    res.json(oneGroup);
  } catch (error) {
    res.status(500).json({
      message:
        error.message + `Error trayendo la informacion del grupo con id ${id}`,
    });
  }
};

//Eliminar un grupo por id
export const deleteGroup = async (req, res) => {
  const { id } = req.params;

  try {
    const data = await Group.findByIdAndDelete(id);
    res.json({
      message: `Grupo con el nombre ${data.nombre} .Eliminada correctamente`,
    });
  } catch (error) {
    res.json({
      message: `error eliminando el grupo con id ${id}`,
    });
  }
};

//Actualizar un grupo
export const updateGroup = async (req, res) => {
  const { id } = req.params;

  try {
    await Group.findByIdAndUpdate(id, req.body);
    res.json({ message: "Grupo actualizado" });
  } catch (error) {
    res.json({
      message: `error intentando actualizar el grupo con id ${id}`,
    });
  }
};
