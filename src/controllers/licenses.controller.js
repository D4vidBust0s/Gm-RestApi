/*
  Archivo con la logica y ejecución de todos los procesos que interactuan con
  la base de datos con respecto las licencias de un trabajador
*/

import Licenses from "../models/Licenses";

//Crear una nuava licencia para un trabajador
export const createLicense = async (req, res) => {

    console.log("ENTRANDO A LA ZONA DE CREACION DE UN REGISTRO DE LICENCIA");
    
  //validacion
  if (!req.body.nombre || !req.body.año || !req.body.fechainicio || !req.body.fechafinal || !req.body.observacion || !req.body.estado || !req.body.nombreempleado || !req.body.idempleado ) {
    return res.status(400).send({
      message:
        "No se han enviado los parametros correctos o alguno de ellos estan vacios",
    });
  }

  try {
    const newPermission = new Licenses({
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
      message: error.message || "Error intentando crear un nuevo registro de licencia",
    });
  }
};

//Listar todos las licensias de un usurio por su id
export const findAllLicenses = async (req, res) => {
  console.log("ENTRANDO A LA ZONA QUE OBTIENE TODOS LOS LISTADOS DE LICENSIAS" );


  try {
    const allLicenses = await Licenses.find();

    if (!allLicenses)
      return res.status(404).json({
        message: `No hay registros para mostrar`,
      });
    res.json(allLicenses);
  } catch (error) {
    res.status(500).json({
      message:
        error.message + `Error trayendo la informacion`,
    });
  }
};


//Listar todas las licencias de un usurio por su id
export const findAllLicensesUser = async (req, res) => {
    console.log("ENTRANDO A LA ZONA QUE OBTIENE LOS REGISTROS DE LICENCIA DE UN TRABAJADOR CON ID " + req.params.id );

    const { id } = req.params;
    const año = req.query.año;

    console.log("El año obtenido es..." + año)
  
    try {
      const allPermisions = await Licenses.find({Id_Empleado:id,Año:año});
  
      if (!allPermisions)
        return res.status(404).json({
          message: `El registro con id ${id} no existe`,
        });
      res.json(allPermisions);
    } catch (error) {
      res.status(500).json({
        message:
          error.message + `Error trayendo la informacion del registro con id  ${id}`,
      });
    }
  };


  //Actualizar registro de licencia de un trabajador con id de registro
 export const updateLicense = async (req, res) => {

  const { id } = req.params;
  const { nombre } = req.body;
  const { año } = req.body;
  const { fechainicio } = req.body;
  const { fechafinal } = req.body;
  const { observacion } = req.body;
  const { estado } = req.body;
  const { nombreempleado } = req.body;
  const { id_empleado } = req.body;


  console.log("ENTRANDO A LA ZONA DE ACTUALIZACION DE LICENCIAS CON ID DE REGISTRO ..." + id);

  
  try {
    await Licenses.updateMany({_id:id},{$set:{Nombre:nombre,Año:año,FechaInicio:fechainicio,FechaFinal:fechafinal,Observacion:observacion,Estado:estado,NombreEmpleado:nombreempleado,Id_Empleado:id_empleado}});
    res.json({ message: "Registro actualizado" });
  } catch (error) {
    res.json({
      message: `error intentando actualizar el registro con id ${id}`,
    });
  }
  
};


//Eliminar licencia por id
export const deleteLicense = async (req, res) => {

  const { id } = req.params;
  console.log("ENTRANDO A LA ZONA DE ELIMINACION DE LICENCIAS CON ID ... "+ id);

  
  try {
    const data = await Licenses.findByIdAndDelete(id);
    res.json({
      message: `Licencia con id  ${id} .Eliminado correctamente`,
    });
  } catch (error) {
    res.json({
      message: `error eliminando la licencia con id ${id}`,
    });
  }
  
};



//---------------------------------------------------------------------------------------------------------------------------------------
//CONSULTAS ESPECIALES
//---------------------------------------------------------------------------------------------------------------------------------------

