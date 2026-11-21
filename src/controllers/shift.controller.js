/*
  Archivo con la logica y ejecución de todos los procesos que interactuan con
  la base de datos con respecto los turnos de un trabajador
*/

import Shifts from "../models/Shifts";
import { anunciarCambioPlanner } from "../utils/plannerEvents";
import {
  liberarPersonalProgramadorDesdeTurno,
  sincronizarPersonalProgramadorDesdeTurno,
} from "../utils/programmerShiftSync";

const sincronizarTurnoProgrammer = async (shift) => {
  try {
    await sincronizarPersonalProgramadorDesdeTurno(shift);
  } catch (error) {
    console.error("No se pudo sincronizar el personal del Programmer:", error);
  }
};

const liberarTurnosProgrammer = async (turnos = []) => {
  const claves = new Set();

  for (const turno of Array.isArray(turnos) ? turnos : []) {
    if (turno?.Type !== "Programmer") continue;

    const clave = `${turno.ID_user}::${turno.Event_name}`;
    if (claves.has(clave)) continue;
    claves.add(clave);

    try {
      await liberarPersonalProgramadorDesdeTurno({
        programmerId: turno.Event_name,
        workerId: turno.ID_user,
      });
    } catch (error) {
      console.error(
        "No se pudo liberar el personal del Programmer:",
        error
      );
    }
  }
};

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
      Out: req.body.out,
      Type: req.body.tipo,

    });

    const shiftSaved = await newShift.save();
    await sincronizarTurnoProgrammer(shiftSaved);
    anunciarCambioPlanner("shifts", {
      action: "created",
      id: shiftSaved._id,
      fechaClave: shiftSaved.Fecha_clave,
    });
    res.json(shiftSaved);
  } catch (error) {
    res.status(200).json({
      message: error.message || "Error intentando crear un nuevo turno",
    });
  }
};


//Listar turnos por fecha in y out
export const findShiftsDaykey = async (req, res) => {

  const daykey = req.query.daykey;

 console.log("-- SE ESTA CONSULTANDO TURNOS POR FECHA CLAVE " + daykey);

  try {

    console.log("ENTRANDO A LA ZONA DE CONSULTA DE TURNOS  CON DIA CLAVE " + daykey);

    
    const oneRegistro = await Shifts.find({Fecha_clave: daykey});

    res.json(oneRegistro);
    
    if(oneRegistro.length==0)
    {
      console.log("No hay turnos programados para mostrar..");
    }

    
  } catch (error) {
    res.status(500).json({
      message: "error intentando listar la información",
    });
  }

};


//Listar turnos por fecha clave
export const findShiftsDate = async (req, res) => {

  const inicial = req.query.in;
  const final = req.query.out;

 console.log("-- SE ESTA CONSULTANDO TURNOS POR FECHA CLAVE " + inicial + "---" + final);

  try {

    console.log("ENTRANDO A LA ZONA DE CONSULTA DE TURNOS  CON FECHA " + inicial + "---" + final);

    
    const oneRegistro = await Shifts.find({
      Fecha_clave: {
        $gte: new Date(inicial),
        $lte: new Date(final)
      }
    });

    res.json(oneRegistro);
    
    if(oneRegistro.length==0)
    {
      console.log("No hay turnos programados para mostrar..");
    }

    
  } catch (error) {
    res.status(500).json({
      message: "error intentando listar la información",
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
    const turnos = await Shifts.find({
      ID_user: ids,
      Fecha_clave: fch,
    }).lean();

    const data = await Shifts.deleteMany({ID_user:ids,Fecha_clave:fch});
    await liberarTurnosProgrammer(turnos);
    if (data.deletedCount > 0) {
      anunciarCambioPlanner("shifts", {
        action: "deleted",
        fechaClave: fch,
      });
    }
    res.json({
      message: `Registros con el nombre ${data.id} .Eliminados correctamente`,
    });
  } catch (error) {
    res.json({
      message: `error eliminando el registro con id ${id}`,
    });
  }

  
};

//Eliminar todos los registros por su nombre
export const deleteStackSavedSingle = async (req, res) => {
  const { id } = req.params;

  console.log("ENTRANDO A LA ZONA DE ELIMINACION DE STACKS-SAVED SINGLE... " + id);
  
  try {
    const turno = await Shifts.findById(id).lean();
    const data = await Shifts.findByIdAndDelete(id);
    if (turno) await liberarTurnosProgrammer([turno]);
    if (data) {
      anunciarCambioPlanner("shifts", {
        action: "deleted",
        id,
        fechaClave: turno?.Fecha_clave,
      });
    }
    res.json({
      message: `Registros con el id ${id} .Eliminados correctamente`,
    });
  } catch (error) {
    res.json({
      message: `error eliminando el registro con id ${id}`,
    });
  }

  
};  


//Eliminar Todos los registros por su fechaClave
export const deleteByFechaClave = async (req, res) => {

const { fecha } = req.params;

  console.log("ENTRANDO A LA ZONA DE ELIMINACION DE SHIFTS POR DIA CLAVE... " + fecha);
  
  try {
    const turnos = await Shifts.find({ Fecha_clave: fecha }).lean();
    const data = await Shifts.deleteMany({Fecha_clave:fecha});
    await liberarTurnosProgrammer(turnos);
    if (data.deletedCount > 0) {
      anunciarCambioPlanner("shifts", {
        action: "deleted",
        fechaClave: fecha,
      });
    }
    res.json({
      message: `Registros con la fecha ${fecha} .Eliminados correctamente`,
    });
  } catch (error) {
    res.json({
      message: `error eliminando el registro con fecha ${fecha}`,
    });
  }

  
};


// Listar turnos para el módulo de rutas por rango de fecha (Fecha_clave)
export const findShiftsForRoutes = async (req, res) => {
  const { fecha } = req.query; // Espera formato "YYYY-MM-DD"

  console.log("-- CONSULTANDO TURNOS PARA RUTAS CON FECHA: " + fecha);

  try {
    if (!fecha) {
      return res.status(400).json({ message: "Se requiere el parámetro fecha" });
    }

    // Abarcar todo el día seleccionado sin importar los milisegundos u hora UTC del ISODate
    const inicioDia = new Date(`${fecha}T00:00:00.000Z`);
    const finDia = new Date(`${fecha}T23:59:59.999Z`);

    const registros = await Shifts.find({
      Fecha_clave: {
        $gte: inicioDia,
        $lte: finDia
      }
    });

    res.json(registros);
  } catch (error) {
    console.error("Error al consultar turnos para rutas:", error);
    res.status(500).json({
      message: "Error intentando listar la información para rutas",
    });
  }
};