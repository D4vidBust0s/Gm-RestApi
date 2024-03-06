/*
  Archivo con la logica y ejecución de todos los procesos que interactuan con
  la base de datos con respecto los permisos de un trabajador
*/

import Recess from "../models/Recess";

//Crear un nuevo permiso para un trabajador
export const createRecess = async (req, res) => {

    console.log("ENTRANDO A LA ZONA DE CREACION DE UN REGISTRO RECESS");
    
  //validacion
  if (!req.body.nombre || !req.body.año || !req.body.fechainicio || !req.body.fechafinal || !req.body.observacion || !req.body.estado || !req.body.nombreempleado || !req.body.idempleado ) {
    return res.status(400).send({
      message:
        "No se han enviado los parametros correctos o alguno de ellos estan vacios",
    });
  }

  try {
    const newPermission = new Recess({
      Nombre: req.body.nombre,
      Año: req.body.año,
      FechaInicio: req.body.fechainicio,
      FechaFinal: req.body.fechafinal,
      Observacion: req.body.observacion,
      Estado: req.body.estado,
      NombreEmpleado: req.body.nombreempleado,
      Id_Empleado: req.body.idempleado,
    });

    const permissionSaved = await newPermission.save();
    res.json(permissionSaved);
  } catch (error) {
    res.status(500).json({
      message: error.message || "Error intentando crear un nuevo registro recess",
    });
  }
};

//Listar todos los recess o vacaciones de un usuario por su id
export const findAllRecess = async (req, res) => {
  console.log("ENTRANDO A LA ZONA QUE OBTIENE TODOS LOS LISTADOS DE RECESS" );


  try {
    const allRecess = await Recess.find();

    if (!allRecess)
      return res.status(404).json({
        message: `No hay registros para mostrar`,
      });
    res.json(allRecess);
  } catch (error) {
    res.status(500).json({
      message:
        error.message + `Error trayendo la informacion`,
    });
  }
};


//Listar todos los permisos de un usurio por su id
export const findAllRecessUser = async (req, res) => {
    console.log("ENTRANDO A LA ZONA QUE OBTIENE LOS REGISTROS DE VACACIONES DE UN TRABAJADOR CON ID " + req.params.id );

    const { id } = req.params;
    const año = req.query.año;

    console.log("El año obtenido es..." + año)
  
    try {
      const allPermisions = await Recess.find({Id_Empleado:id,Año:año});
  
      if (!allPermisions)
        return res.status(404).json({
          message: `La persona con id ${id} no existe`,
        });
      res.json(allPermisions);
    } catch (error) {
      res.status(500).json({
        message:
          error.message + `Error trayendo la informacion del RECESS con id de usurio ${id}`,
      });
    }
  };


  //Actualizar registro de permiso de un trabajador con id de registro
 export const updateRecess = async (req, res) => {

  const { id } = req.params;
  const { nombre } = req.body;
  const { año } = req.body;
  const { fechainicio } = req.body;
  const { fechafinal } = req.body;
  const { observacion } = req.body;
  const { estado } = req.body;
  const { nombreempleado } = req.body;
  const { id_empleado } = req.body;


  console.log("ENTRANDO A LA ZONA DE ACTUALIZACION DE RECESS CON ID DE REGISTRO ..." + id);

  
  try {
    await Recess.updateMany({_id:id},{$set:{Nombre:nombre,Año:año,FechaInicio:fechainicio,FechaFinal:fechafinal,Observacion:observacion,Estado:estado,NombreEmpleado:nombreempleado,Id_Empleado:id_empleado}});
    res.json({ message: "Registro actualizado" });
  } catch (error) {
    res.json({
      message: `error intentando actualizar el registro con id ${id}`,
    });
  }
  
};


//Eliminar Permission por id
export const deleteRecess = async (req, res) => {

  const { id } = req.params;
  console.log("ENTRANDO A LA ZONA DE ELIMINACION DE RECESS CON ID ... "+ id);

  
  try {
    const data = await Recess.findByIdAndDelete(id);
    res.json({
      message: `Registro Recess con id  ${id} .Eliminado correctamente`,
    });
  } catch (error) {
    res.json({
      message: `error eliminando el registro recess con id ${id}`,
    });
  }
  
};

