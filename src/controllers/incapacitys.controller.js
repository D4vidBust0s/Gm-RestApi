/*
  Archivo con la logica y ejecución de todos los procesos que interactuan con
  la base de datos con respecto los permisos de un trabajador
*/

import Incapacitys from "../models/Incapacitys";

//Crear un nuevo permiso para un trabajador
export const createIncapacity = async (req, res) => {

    console.log("ENTRANDO A LA ZONA DE CREACION DE INCAPACIDADES");
    
  //validacion
  if (!req.body.nombre || !req.body.año || !req.body.fechainicio || !req.body.fechafinal || !req.body.observacion || !req.body.estado || !req.body.nombreempleado || !req.body.idempleado ) {
    return res.status(400).send({
      message:
        "No se han enviado los parametros correctos o alguno de ellos estan vacios",
    });
  }

  try {
    const newPermission = new Incapacitys({
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
      message: error.message || "Error intentando crear un nuevo permiso",
    });
  }
};


//Listar todos los permisos de un usurio por su id
export const findAllIncapacitys = async (req, res) => {
  console.log("ENTRANDO A LA ZONA QUE OBTIENE TODOS LOS LISTADOS DE INCAPPACIDADES" );


  try {
    const allIncapacitys = await Incapacitys.find();

    if (!allIncapacitys)
      return res.status(404).json({
        message: `No hay registros para mostrar`,
      });
    res.json(allIncapacitys);
  } catch (error) {
    res.status(500).json({
      message:
        error.message + `Error trayendo la informacion`,
    });
  }
};


//Listar todos los permisos de un usurio por su id
export const findAllIncapacitysUser = async (req, res) => {
    console.log("ENTRANDO A LA ZONA QUE OBTIENE LOS PERMISOS DE UN TRABAJADOR CON ID " + req.params.id );

    const { id } = req.params;
    const año = req.query.año;

    console.log("El año obtenido es..." + año)
  
    try {
      const allPermisions = await Incapacitys.find({Id_Empleado:id,Año:año});
  
      if (!allPermisions)
        return res.status(404).json({
          message: `La persona con id ${id} no existe`,
        });
      res.json(allPermisions);
    } catch (error) {
      res.status(500).json({
        message:
          error.message + `Error trayendo la informacion del permiso con id de usurio ${id}`,
      });
    }
  };


  //Actualizar registro de permiso de un trabajador con id de registro
 export const updateIncapacity = async (req, res) => {

  const { id } = req.params;
  const { nombre } = req.body;
  const { año } = req.body;
  const { fechainicio } = req.body;
  const { fechafinal } = req.body;
  const { observacion } = req.body;
  const { estado } = req.body;
  const { nombreempleado } = req.body;
  const { id_empleado } = req.body;


  console.log("ENTRANDO A LA ZONA DE ACTUALIZACION DE REGISTROS CON ID DE REGISTRO ..." + id);

  
  try {
    await Incapacitys.updateMany({_id:id},{$set:{Nombre:nombre,Año:año,FechaInicio:fechainicio,FechaFinal:fechafinal,Observacion:observacion,Estado:estado,NombreEmpleado:nombreempleado,Id_Empleado:id_empleado}});
    res.json({ message: "Registro actualizado" });
  } catch (error) {
    res.json({
      message: `error intentando actualizar el registro con id ${id}`,
    });
  }
  
};


//Eliminar Permission por id
export const deleteIncapacity = async (req, res) => {

  const { id } = req.params;
  console.log("ENTRANDO A LA ZONA DE ELIMINACION DE PERMISOS CON ID ... "+ id);

  
  try {
    const data = await Incapacitys.findByIdAndDelete(id);
    res.json({
      message: `Permisos con id  ${id} .Eliminado correctamente`,
    });
  } catch (error) {
    res.json({
      message: `error eliminando el permiso con id ${id}`,
    });
  }
  
};

