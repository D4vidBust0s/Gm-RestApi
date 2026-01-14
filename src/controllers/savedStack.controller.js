/*
  Archivo con la logica y ejecución de todos los procesos que interactuan con
  la base de datos con respecto los turnos de un trabajador
*/

import SavedStack from "../models/SavedStack";

//Crear un nuevo turno para un trabajador
export const createSaveStack = async (req, res) => {
  
  console.log("ENTRANDO A LA ZONA DE RESPALDO DE UN STACK ");
  
  //validacion
  
  
  try {
    const newShift = new SavedStack({
      Nombre_Stack: req.body.nombreStack,
      ID_user: req.body.idUser,
      Nombres: req.body.nombres,
      Index: req.body.index,
      Event_name: req.body.idPrograma,
      ID_event: req.body.eventId,
      Color: req.body.color,
      Observacion: req.body.observacion,
      Fecha_clave: req.body.fechaClave,
      Id_Schema: req.body.idSchema,
      Inicio_main: req.body.inicioMain,
      Out: req.body.out,
      Type: req.body.tipo,
      
    });

    const shiftSaved = await newShift.save();
    res.json(shiftSaved);
  } catch (error) {
    res.status(200).json({
      message: error.message || "Error intentando crear un nuevo registro",
    });
  }
};

//Listar todos los registros 
export const findAllREg = async (req, res) => {


  try {

    console.log("ENTRANDO A LA ZONA DE CONSULTA DE STACKS SAVED " );

    
    const oneRegistro = await SavedStack.find().sort({Index:1});
    res.json(oneRegistro);
    
    if(oneRegistro.length==0)
    {
      console.log("No hay registros para mostrar");
    }

    
  } catch (error) {
    res.status(500).json({
      message: "error intentando listar la información",
    });
  }

};



//Listar turnos por id de usuario y fecha especifica
export const findRegByName = async (req, res) => {

  const NOMBRE = req.query.nombre;
  
  try {
    
    console.log("ENTRANDO A LA ZONA DE CONSULTA DE TURNOS POR NOMBRE " + NOMBRE);
    
    
    const oneRegistro = await SavedStack.find({Nombre_Stack:NOMBRE}).sort({Index:1});
    res.json(oneRegistro);
    
    if(oneRegistro.length==0)
    {
      console.log("No hay turnos programados para mostrar");
    }
    
    
  } catch (error) {
    res.status(500).json({
      message: "error intentando listar la información",
    });
  }
  
};

//Actualizar un saveStack
export const updateSaveStack = async (req, res) => {
  const { id } = req.params;
  const { nombre } = req.body;

  console.log("ENTRANDO A LA ZONA DE ACTUALIZACION DE UN STACKSAVED CON ID - "+ id);

  
  try {
    await SavedStack.updateMany({Nombre_Stack:id},{$set:{Nombre_Stack:nombre}});
    res.json({ message: "SaveStack name updated" });
  } catch (error) {
    res.json({
      message: `error intentando actualizar el registro con id ${id}`,
    });
  }
  
};




//Eliminar todos los registros por su nombre
export const deleteStackSaved = async (req, res) => {
  const { id } = req.params;

  console.log("ENTRANDO A LA ZONA DE ELIMINACION DE STACKS-SAVED... ");
  
  try {
    const data = await SavedStack.deleteMany({Nombre_Stack:id});
    res.json({
      message: `Registros con el nombre ${id} .Eliminados correctamente`,
    });
  } catch (error) {
    res.json({
      message: `error eliminando el registro con id ${id}`,
    });
  }

  
};  




