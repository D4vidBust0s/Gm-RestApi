/*
  Archivo con la logica y ejecución de todos los procesos que interactuan con
  la base de datos con respecto los turnos de un trabajador
*/

import Shifts from "../models/Shifts";

//Crear un nuevo turno para un trabajador
export const createShift = async (req, res) => {

    console.log("ENTRANDO A LA ZONA DE CREACION DE UN TURNO ");
    
  //validacion
  

  try {
    const newShift = new Shifts({
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
      Type: req.body.tipo,

    });

    const shiftSaved = await newShift.save();
    res.json(shiftSaved);
  } catch (error) {
    res.status(200).json({
      message: error.message || "Error intentando crear un nuevo turno",
    });
  }
};


//Listar turnos por id de usuario y fecha especifica
export const findShiftsIdDate = async (req, res) => {
  const id = req.query.id;
  const fecha = req.query.fecha;
  //const formatFecha = new Date(fecha);

  try {

    console.log("ENTRANDO A LA ZONA DE CONSULTA DE TURNOS POR ID " + id + " Y CON FECHA " + fecha);

    
    const oneRegistro = await Shifts.find({ID_user:id, Fecha_clave:fecha});
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


//Listar todos los turnos 
export const findShiftsFull = async (req, res) => {


  try {

    console.log("ENTRANDO A LA ZONA DE CONSULTA DE TURNOS LISTADO FULL " );

    
    const oneRegistro = await Shifts.find().sort({Index:1});
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


//Eliminar un grupo por id de usuario y fecha
export const deleteShift = async (req, res) => {
  const {ids} = req.body;
  const {fch} = req.body;

  console.log("ENTRANDO A LA ZONA DE ELIMINACION DE SHIFTS... ");
  
  try {
    const data = await Shifts.deleteMany({ID_user:ids,Fecha_clave:fch});
    res.json({
      message: `Registros con el nombre ${data.id} .Eliminados correctamente`,
    });
  } catch (error) {
    res.json({
      message: `error eliminando el registro con id ${id}`,
    });
  }

  
};
