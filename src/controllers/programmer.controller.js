/*
  Archivo con la logica y ejecución de todos los procesos que interactuan con
  la base de datos con respecto al programmador
*/

import Programmers from "../models/Programmer";

//Crear un nuevo turno para un trabajador
export const createProgrammer = async (req, res) => {

    console.log("ENTRANDO A LA ZONA DE CREACION DE UN REGISTRO PROGRAMMER ");
    
  //validacion
  

  try {
    const newProgrammer = new Programmers({
     Nombre: req.body.nombre,
     Observacion: req.body.observacion,
     Fecha_clave: req.body.fechaClave,
     Fecha_start: req.body.fechaStart,
     Fecha_end: req.body.fechaEnd,
     Time_in: req.body.timeIn,
     Time_out: req.body.timeOut,
     Color: req.body.color,
    });

    const programmerSaved = await newProgrammer.save();
    res.json(programmerSaved);
  } catch (error) {
    res.status(200).json({
      message: error.message || "Error intentando crear un nuevo programmer",
    });
  }
};




//Listar todos los registros
export const findProgrammersFull = async (req, res) => {


    try {
  
      console.log("ENTRANDO A LA ZONA DE CONSULTA DE PROGRAMMERS LISTADO FULL " );
  
      
      const oneRegistro = await Programmers.find();
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

  //Listar registros por  fecha clave 
export const findProgrammerByDate = async (req, res) => {
   
    const fecha = req.query.fecha;
    console.log("La fecha recibida es... " + fecha);
  
    try {
  
      console.log("ENTRANDO A LA ZONA DE CONSULTA DE PROGRAMMERS POR FECHA CLAVE " + fecha);
  
      
      const oneRegistro = await Programmers.find({Fecha_clave:fecha});
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



 //Actualizar registro de permiso de un trabajador con id de registro
 export const updateProgrammer = async (req, res) => {

    const { id } = req.params;
    const { nombre } = req.body;
    const { observacion } = req.body;
    const { fechaClave } = req.body;
    const { fechaStart } = req.body;
    const { fechaEnd } = req.body;
    const { timeIn } = req.body;
    const { timeOut } = req.body;
    const { color } = req.body;
  
  
    console.log("ENTRANDO A LA ZONA DE ACTUALIZACION DE PROGRAMMER CON ID DE REGISTRO ..." + id);
  
    
    try {
      await Programmers.updateMany({_id:id},{$set:{Nombre:nombre,Observacion:observacion,Fecha_clave:fechaClave,Fecha_start:fechaStart,Fecha_end:fechaEnd,Time_in:timeIn,Time_out:timeOut,Color:color}});
      res.json({ message: "Registro actualizado" });
    } catch (error) {
      res.json({
        message: `error intentando actualizar el registro con id ${id}`,
      });
    }
    
  };




//Eliminar evento por id
export const deleteProgrammer = async (req, res) => {

    const { idP } = req.params;
    console.log("ENTRANDO A LA ZONA DE ELIMINACION DE PROGRAMMERS CON ID ... "+ idP);
  
    
    try {
     await Programmers.findByIdAndDelete(idP);
      res.json({
        message: `Permisos con id  ${idP} .Eliminado correctamente`,
      });
    } catch (error) {
      res.json({
        message: `error eliminando el permiso con id ${idP}`,
      });
    }
    
  };
  