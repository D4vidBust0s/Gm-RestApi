/*
  Archivo con la logica y ejecución de todos los procesos que interactuan con
  la base de datos con respecto las sustituciones temporales de trabajadores del sistema
*/

import Substitutions from "../models/Substitutions";

//Crear un nuevo registro
export const createSubstitution = async (req, res) => {

    console.log("ENTRANDO A LA ZONA DE CREACION DE SUSTUTUCIONES " +req.body.idUserMain);
    
  //validacion
  

  try {
    const newSubstitution = new Substitutions({
      ID_user_main: req.body.idUserMain,
      ID_user_sustituto: req.body.idUserSustituto,
      NombreLeft: req.body.nombreLeft,
      NombreRight: req.body.nombreRight,
      ID_grupo_iz: req.body.idGrupoIz,
      ID_grupo_der: req.body.idGrupoDer,
      Fecha_dia: req.body.fechaDia,
      Operacion: req.body.operacion,
      
    });

    const substitutionSaved = await newSubstitution.save();
    res.json(substitutionSaved);
  } catch (error) {
    res.status(200).json({
      message: error.message || "Error intentando crear un nuevo registro substitucion",
    });
  }
};


//Listar todos los turnos 
export const findAllReg = async (req, res) => {


    try {
  
      console.log("ENTRANDO A LA ZONA DE CONSULTA DE TODAS LAS SUSTITUCIONES" );
  
      const allRegistro = await Substitutions.find();
      res.json(allRegistro);
  
      
    } catch (error) {
      res.status(500).json({
        message: "error intentando listar la información",
      });
    }
  
  };



//Eliminar un item id
export const deleteReg = async (req, res) => {
  const { id } = req.params;

  try {
    const data = await Substitutions.findByIdAndDelete(id);
    res.json({
      message: `Registro con el id ${data._id} .Eliminada correctamente`,
    });
  } catch (error) {
    res.json({
      message: `error eliminando el registro con id ${id}`,
    });
  }
};


//Listar el registro por id de usuario y fecha
export const findNameById = async (req, res) => {

  const {id} = req.params;
  const {fecha} = req.params;
  
    console.log("El id de schema es..."+id + " y la fecha es .. " + fecha);

  try {
    
    const allReg = await Substitutions.find({ID_user_sustituto:id,Fecha_dia:fecha});
    res.json(allReg);
    
    if(allReg.length==0)
    {
      console.log("No hay registros para mostrar");
    }

  } catch (error) {
    res.status(500).json({
      message: "error intentando listar la información",
    });
  }

};
  

/*
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
*/
