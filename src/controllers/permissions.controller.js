/*
  Archivo con la logica y ejecución de todos los procesos que interactuan con
  la base de datos con respecto los permisos de un trabajador
*/

import Permissions from "../models/Permissions";

//Crear un nuevo permiso para un trabajador
export const createPermission = async (req, res) => {

    console.log("ENTRANDO A LA ZONA DE CREACION DE UN PERMISO");
    
  //validacion
  if (!req.body.nombre || !req.body.año || !req.body.fechainicio || !req.body.fechafinal || !req.body.observacion || !req.body.estado || !req.body.nombreempleado || !req.body.idempleado ) {
    return res.status(400).send({
      message:
        "No se han enviado los parametros correctos o alguno de ellos estan vacios",
    });
  }

  try {
    const newPermission = new Permissions({
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
export const findAllPermissions = async (req, res) => {
  console.log("ENTRANDO A LA ZONA QUE OBTIENE TODOS LOS LISTADOS DE PERMISOS" );


  try {
    const allPermisions = await Permissions.find();

    if (!allPermisions)
      return res.status(404).json({
        message: `No hay registros para mostrar`,
      });
    res.json(allPermisions);
  } catch (error) {
    res.status(500).json({
      message:
        error.message + `Error trayendo la informacion`,
    });
  }
};


//Listar todos los permisos de un usurio por su id
export const findAllPermissionsUser = async (req, res) => {
    console.log("ENTRANDO A LA ZONA QUE OBTIENE LOS PERMISOS DE UN TRABAJADOR CON ID " + req.params.id );

    const { id } = req.params;
    const año = req.query.año;

    console.log("El año obtenido es..." + año)
  
    try {
      const allPermisions = await Permissions.find({Id_Empleado:id,Año:año});
  
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
 export const updatePermiso = async (req, res) => {

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
    await Permissions.updateMany({_id:id},{$set:{Nombre:nombre,Año:año,FechaInicio:fechainicio,FechaFinal:fechafinal,Observacion:observacion,Estado:estado,NombreEmpleado:nombreempleado,Id_Empleado:id_empleado}});
    res.json({ message: "Registro actualizado" });
  } catch (error) {
    res.json({
      message: `error intentando actualizar el registro con id ${id}`,
    });
  }
  
};


//Eliminar Permission por id
export const deletePermission = async (req, res) => {

  const { id } = req.params;
  console.log("ENTRANDO A LA ZONA DE ELIMINACION DE PERMISOS CON ID ... "+ id);

  
  try {
    const data = await Permissions.findByIdAndDelete(id);
    res.json({
      message: `Permisos con id  ${id} .Eliminado correctamente`,
    });
  } catch (error) {
    res.json({
      message: `error eliminando el permiso con id ${id}`,
    });
  }
  
};
















/*

//Listar todas los grupos
export const findAllPayroll = async (req, res) => {
  try {
    const payroll = await Payroll.find();
    res.json(payroll);
  } catch (error) {
    res.status(500).json({
      message: "error intentando listar el payroll",
    });
  }
};



//Listar un Grupo por nombre del grupo
export const findOnePersonByGroup = async (req, res) => {
  const { group } = req.params;
  console.log("Entrando a la zona de consultas en payroll, el grupo es..."+ group);

  try {
    const onePerson = await Payroll.find({grupo:group});

    if (!onePerson)
      return res.status(404).json({
        message: `No hay personas bajo el grupo ${group} o no existe`,
      });
    res.json(onePerson);
  } catch (error) {
    res.status(500).json({
      message:
        error.message + `Error trayendo la informacion del payroll con el grupo ${group}`,
    });
  }
};






//---------------------------------------------------------------------------------------------------------------------------------------
//CONSULTAS ESPECIALES
//---------------------------------------------------------------------------------------------------------------------------------------

//Listar un Grupo por id
export const showPersonsByGroup = async (req, res) => {
  const {nameGroup} = req.params;
  

  try {
    const persons = await Payroll.find({grupo:nameGroup});
    console.log(nameGroup);

    if (!persons)
      return res.status(404).json({
        message: `El grupo con id ${id} no existe`,
      });
    res.json(persons);
  } catch (error) {
    res.status(500).json({
      message:
        error.message + `Error trayendo los usuarios que pertenecen al grupo con id ${id}`,
    });
  }
};

*/