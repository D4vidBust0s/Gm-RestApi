/*
  Archivo con la logica y ejecución de todos los procesos que interactuan con
  la base de datos con respecto los turnos de un trabajador
*/

import Shifts from "../models/Shifts";

//Crear un nuevo turno para un trabajador
export const createShift = async (req, res) => {

    console.log("ENTRANDO A LA ZONA DE CREACION DE UN TURNO ");
    
  //validacion
  if (!req.body.idUser || !req.body.nombreUser || !req.body.subGrupo || !req.body.fechaActiva || !req.body.start || !req.body.end  || !req.body.color || !req.body.tipo)
   {
    return res.status(400).send({
      message:
        "No se han enviado los parametros correctos o alguno de ellos estan vacios",
    });
  }

  try {
    const newShift = new Shifts({
      ID_User: req.body.idUser,
      NombreUser: req.body.nombreUser,
      SubGrupo: req.body.subGrupo,
      FechaActiva: req.body.fechaActiva,
      Start: req.body.start,
      End: req.body.end,
      Evento: req.body.evento,
      Color: req.body.color,
      Tipo: req.body.tipo,
      Observacion: req.body.observacion,
    });

    const shiftSaved = await newShift.save();
    res.json(shiftSaved);
  } catch (error) {
    res.status(500).json({
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

    
    const oneRegistro = await Shifts.find({ID_User:id, FechaActiva:fecha});
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