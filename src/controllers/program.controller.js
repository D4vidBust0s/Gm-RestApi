/*
  Archivo con la logica y ejecución de todos los procesos que interactuan con
  la base de datos con respecto a los programas fijos
*/

import Program from "../models/Programs";

//Crear un nuevo Program
export const createProgram = async (req, res) => {
  //validacion
  if (!req.body.nombre || !req.body.start || !req.body.end || !req.body.descripcion) {
    return res.status(400).send({
      message:
        "No se han enviado los parametros correctos o alguno de ellos esta vacio",
    });
  }

  try {
    const newProgram = new Program({
      nombre: req.body.nombre,
      lunes: req.body.lunes,
      Martes: req.body.martes,
      Miercoles: req.body.miercoles,
      Jueves: req.body.jueves,
      Viernes: req.body.viernes,
      Sabado: req.body.sabado,
      Domingo: req.body.domingo,
      Start: req.body.start,
      End: req.body.end,
      descripcion: req.body.descripcion,
    });

    const programSaved = await newProgram.save();
    res.json(programSaved);
  } catch (error) {
    res.status(500).json({
      message: error.message || "Error intentando crear el programa",
    });
  }
};



//Listar todas los Programs
export const findAllPrograms = async (req, res) => {
  try {
    const program = await Program.find();
    res.json(program);
  } catch (error) {
    res.status(500).json({
      message: "error intentando listar los Programs",
    });
  }
};


//Listar todas los Programs entre semana
export const findAllProgramsWeekDay = async (req, res) => {
  try {
    const program = await Program.find({$or:[{Sabado:false},{Domingo:false}]});
    res.json(program);
  } catch (error) {
    res.status(500).json({
      message: "error intentando listar los Programs",
    });
  }
};


//Listar todas los Programs fin de semana
export const findAllProgramsWeekend = async (req, res) => {
  try {
    const program = await Program.find({$or:[{Sabado:true},{Domingo:true}]});
    res.json(program);
  } catch (error) {
    res.status(500).json({
      message: "error intentando listar los Programs",
    });
  }
};


//Eliminar un program por id
export const deleteProgram = async (req, res) => {
  const { id } = req.params;

  try {
    const data = await Program.findByIdAndDelete(id);
    res.json({
      message: `Program con el nombre ${data.nombre} .Eliminada correctamente`,
    });
  } catch (error) {
    res.json({
      message: `error eliminando el program con id ${id}`,
    });
  }
};


//Listar un Grupo por id 
export const findOneProgram = async (req, res) => {
  const { id } = req.params;

  try {
    const oneProgram = await Program.findById(id);

    if (!oneProgram)
      return res.status(404).json({
        message: `El program con id ${id} no existe`,
      });
    res.json(oneProgram);
  } catch (error) {
    res.status(500).json({
      message:
        error.message + `Error trayendo la informacion del programa con id ${id}`,
    });
  }
};



//Actualizar un grupo
export const updateProgram = async (req, res) => {
  const { id } = req.params;

  try {
    await Program.findByIdAndUpdate(id, req.body);
    res.json({ message: "Program actualizado" });
  } catch (error) {
    res.json({
      message: `error intentando actualizar el Program con id ${id}`,
    });
  }
};


