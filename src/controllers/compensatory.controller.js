/*
  Archivo con la lógica y ejecución de todos los procesos que interactúan con
  la base de datos con respecto a los compensatorios de un trabajador
*/

import Compensatory from "../models/Compensatory";
import { anunciarCambioPlanner } from "../utils/plannerEvents";

// Crear un nuevo compensatorio para un trabajador
export const createCompensatory = async (req, res) => {

    console.log("ENTRANDO A LA ZONA DE CREACION DE COMPENSATORIOS");
    
  // validacion
  if (!req.body.nombre || !req.body.año || !req.body.fechainicio || !req.body.fechafinal || !req.body.observacion || req.body.estado === undefined || !req.body.nombreempleado || (!req.body.idempleado && !req.body.id_empleado)) {
    return res.status(400).send({
      message:
        "No se han enviado los parametros correctos o alguno de ellos estan vacios",
    });
  }

  try {
    const newCompensatory = new Compensatory({
      Nombre: req.body.nombre,
      Año: req.body.año,
      FechaInicio: req.body.fechainicio,
      FechaFinal: req.body.fechafinal,
      Observacion: req.body.observacion,
      Estado: req.body.estado,
      NombreEmpleado: req.body.nombreempleado,
      Id_Empleado: req.body.idempleado || req.body.id_empleado,
    });

    const compensatorySaved = await newCompensatory.save();
    anunciarCambioPlanner("compensatories", {
      action: "created",
      id: compensatorySaved._id,
    });
    res.json(compensatorySaved);
  } catch (error) {
    res.status(500).json({
      message: error.message || "Error intentando crear un nuevo compensatorio",
    });
  }
};

// Listar todos los compensatorios sin filtros
export const findAllCompensatories = async (req, res) => {
  console.log("ENTRANDO A LA ZONA QUE OBTIENE TODOS LOS LISTADOS DE COMPENSATORIOS");

  try {
    const allCompensatories = await Compensatory.find();

    if (!allCompensatories)
      return res.status(404).json({
        message: `No hay registros para mostrar`,
      });
    res.json(allCompensatories);
  } catch (error) {
    res.status(500).json({
      message:
        error.message + `Error trayendo la informacion`,
    });
  }
};

// Listar todos los compensatorios de un usuario en específico por su id en un año específico
export const findAllCompensatoriesUser = async (req, res) => {
    console.log("ENTRANDO A LA ZONA QUE OBTIENE LOS COMPENSATORIOS DE UN TRABAJADOR CON ID " + req.params.id);

    const { id } = req.params;
    const año = req.query.año;

    console.log("El año obtenido es..." + año);
  
    try {
      const allCompensatories = await Compensatory.find({Id_Empleado: id, Año: año});
  
      if (!allCompensatories)
        return res.status(404).json({
          message: `La persona con id ${id} no existe`,
        });
      res.json(allCompensatories);
    } catch (error) {
      res.status(500).json({
        message:
          error.message + `Error trayendo la informacion del compensatorio con id de usuario ${id}`,
      });
    }
};

// Actualizar registro de compensatorio de un trabajador con id de registro
export const updateCompensatory = async (req, res) => {

  const { id } = req.params;
  const { nombre, año, fechainicio, fechafinal, observacion, estado, nombreempleado, idempleado, id_empleado } = req.body;

  console.log("ENTRANDO A LA ZONA DE ACTUALIZACION DE REGISTROS CON ID DE REGISTRO ..." + id);
  
  try {
    await Compensatory.updateMany(
      {_id: id},
      {$set: {
        Nombre: nombre,
        Año: año,
        FechaInicio: fechainicio,
        FechaFinal: fechafinal,
        Observacion: observacion,
        Estado: estado,
        NombreEmpleado: nombreempleado,
        Id_Empleado: idempleado || id_empleado
      }}
    );
    anunciarCambioPlanner("compensatories", { action: "updated", id });
    res.json({ message: "Registro actualizado" });
  } catch (error) {
    res.json({
      message: `error intentando actualizar el registro con id ${id}`,
    });
  }
};

// Eliminar Compensatory por id
export const deleteCompensatory = async (req, res) => {

  const { id } = req.params;
  console.log("ENTRANDO A LA ZONA DE ELIMINACION DE COMPENSATORIOS CON ID ... " + id);
  
  try {
    await Compensatory.findByIdAndDelete(id);
    anunciarCambioPlanner("compensatories", { action: "deleted", id });
    res.json({
      message: `Compensatorio con id ${id} .Eliminado correctamente`,
    });
  } catch (error) {
    res.json({
      message: `error eliminando el compensatorio con id ${id}`,
    });
  }
};