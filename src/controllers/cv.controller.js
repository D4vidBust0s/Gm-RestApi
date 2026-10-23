/*
  Archivo con la lógica y ejecución de todos los procesos que interactuan con
  la base de datos con respecto al historial de CV / Novedades de un trabajador
*/

import Cv from "../models/Cv";

// Crear un nuevo registro en el CV de un trabajador
export const createCvRecord = async (req, res) => {
  console.log("ENTRANDO A LA ZONA DE CREACION DE UN REGISTRO DE CV");
  
  // Validación de parámetros obligatorios
  if (!req.body.nombre || !req.body.año || !req.body.fechainicio || !req.body.fechafinal || !req.body.observacion || !req.body.estado || !req.body.nombreempleado || !req.body.idempleado) {
    return res.status(400).send({
      message: "No se han enviado los parámetros correctos o alguno de ellos está vacío",
    });
  }

  try {
    const newCvRecord = new Cv({
      Nombre: req.body.nombre,
      Año: req.body.año,
      FechaInicio: req.body.fechainicio,
      FechaFinal: req.body.fechafinal,
      Observacion: req.body.observacion,
      Estado: req.body.estado,
      NombreEmpleado: req.body.nombreempleado,
      Id_Empleado: req.body.idempleado,
    });

    const cvSaved = await newCvRecord.save();
    res.json(cvSaved);
  } catch (error) {
    res.status(500).json({
      message: error.message || "Error intentando crear un nuevo registro de CV",
    });
  }
};

// Listar todos los registros de CV generales sin filtro
export const findAllCvRecords = async (req, res) => {
  console.log("ENTRANDO A LA ZONA QUE OBTIENE TODOS LOS LISTADOS DE CV");

  try {
    const allCv = await Cv.find();

    if (!allCv)
      return res.status(404).json({
        message: `No hay registros para mostrar`,
      });
    res.json(allCv);
  } catch (error) {
    res.status(500).json({
      message: error.message + ` Error trayendo la información de CV`,
    });
  }
};

// Listar los registros de CV de un usuario en específico por su ID y año
export const findAllCvUser = async (req, res) => {
  console.log("ENTRANDO A LA ZONA QUE OBTIENE LOS REGISTROS DE CV DE UN TRABAJADOR CON ID " + req.params.id);

  const { id } = req.params;
  const año = req.query.año;

  console.log("El año obtenido para CV es..." + año);

  try {
    const userCvRecords = await Cv.find({ Id_Empleado: id, Año: año });

    if (!userCvRecords)
      return res.status(404).json({
        message: `La persona con id ${id} no tiene registros de CV`,
      });
    res.json(userCvRecords);
  } catch (error) {
    res.status(500).json({
      message: error.message + ` Error trayendo la información del CV con id de usuario ${id}`,
    });
  }
};

// Actualizar un registro del CV de un trabajador por ID de registro
export const updateCvRecord = async (req, res) => {
  const { id } = req.params;
  const { nombre, año, fechainicio, fechafinal, observacion, estado, nombreempleado, id_empleado } = req.body;

  console.log("ENTRANDO A LA ZONA DE ACTUALIZACION DE CV CON ID DE REGISTRO ..." + id);

  try {
    await Cv.updateMany(
      { _id: id },
      {
        $set: {
          Nombre: nombre,
          Año: año,
          FechaInicio: fechainicio,
          FechaFinal: fechafinal,
          Observacion: observacion,
          Estado: estado,
          NombreEmpleado: nombreempleado,
          Id_Empleado: id_empleado
        }
      }
    );
    res.json({ message: "Registro de CV actualizado correctamente" });
  } catch (error) {
    res.status(500).json({
      message: `Error intentando actualizar el registro de CV con id ${id}`,
    });
  }
};

// Eliminar un registro de CV por ID
export const deleteCvRecord = async (req, res) => {
  const { id } = req.params;
  console.log("ENTRANDO A LA ZONA DE ELIMINACION DE CV CON ID ... " + id);

  try {
    await Cv.findByIdAndDelete(id);
    res.json({
      message: `Registro de CV con id ${id} eliminado correctamente`,
    });
  } catch (error) {
    res.status(500).json({
      message: `Error eliminando el registro de CV con id ${id}`,
    });
  }
};