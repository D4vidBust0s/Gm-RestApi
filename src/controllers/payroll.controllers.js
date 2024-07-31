/*
  Archivo con la logica y ejecución de todos los procesos que interactuan con
  la base de datos con respecto al payroll
*/

import Payroll from "../models/Payroll";

//Crear una nueva persona en payroll
export const createPayroll = async (req, res) => {
  //validacion
  if (!req.body.Nombres) {
    return res.status(400).send({
      message:
        "No se han enviado los parametros correctos o alguno de ellos estan vacios",
    });
  }

  try {
    const newPayroll = new Payroll({
      nombres: req.body.Nombres,
      apellidos: req.body.Apellidos,
      edad: req.body.Edad,
      fechaDeNacimiento: req.body.FechaDeNacimiento,
      genero: req.body.Genero,
      estadoCivil: req.body.EstadoCivil,
      celularPrioritario: req.body.CelularPrioritario,
      celularAux: req.body.CelularAux,
      telefonoFijo: req.body.TelefonoFijo,
      direccionResidencia: req.body.DireccionResidencia,
      email: req.body.Email,
      cc: req.body.Cc,
      pasaporte: req.body.Pasaporte,
      tarjetaProfesional: req.body.TarjetaProfesional,
      cargo: req.body.Cargo,
      grupoID: req.body.GrupoID,
      grupo: req.body.Grupo,
      fechaIngreso: req.body.FechaIngreso,
      RH: req.body.RH,
      contactoPrincipal: req.body.ContactoPrincipal,
      contactoAux: req.body.ContactoAux,
      activo: req.body.Activo,
      mainplanner: req.body.Mainplanner,
      subGrupo: req.body.SubGrupo,
      
    });

    const payrollSaved = await newPayroll.save();
    res.json(payrollSaved);
  } catch (error) {
    res.status(500).json({
      message: error.message || "Error intentando crear un usuario payroll",
    });
  }
};

//Listar todas los grupos
export const findAllPayroll = async (req, res) => {
  try {
    const payroll = await Payroll.find().sort({subGrupo:1});
    res.json(payroll);
  } catch (error) {
    res.status(500).json({
      message: "error intentando listar el payroll",
    });
  }
};

//Listar un Grupo por id
export const findOnePerson = async (req, res) => {
  const { id } = req.params;

  try {
    const onePerson = await Payroll.findById(id);

    if (!onePerson)
      return res.status(404).json({
        message: `La persona con id ${id} no existe`,
      });
    res.json(onePerson);
  } catch (error) {
    res.status(500).json({
      message:
        error.message + `Error trayendo la informacion del payroll con id ${id}`,
    });
  }
};


//Listar un Grupo por id de grupo
export const findByIdGroup = async (req, res) => {
  const { idgroup } = req.params;
  console.log("Entrando a la zona de consultas en payroll, el ID de grupo es..."+ idgroup);

  try {
    const onePerson = await Payroll.find({grupoID:idgroup});

    if (!onePerson)
      return res.status(404).json({
        message: `No hay personas bajo el ID de grupo ${idgroup} o no existe`,
      });
    res.json(onePerson);
  } catch (error) {
    res.status(500).json({
      message:
        error.message + `Error trayendo la informacion del payroll con el Id degrupo ${idgroup}`,
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


//Eliminar un grupo por id
export const deletePerson = async (req, res) => {
  const { id } = req.params;

  try {
    const data = await Payroll.findByIdAndDelete(id);
    res.json({
      message: `Persona con el nombre ${data.nombre} .Eliminada correctamente`,
    });
  } catch (error) {
    res.json({
      message: `error eliminando la persona con id ${id}`,
    });
  }
};

//Actualizar una persona del payroll
export const updatePerson = async (req, res) => {
  const { id } = req.params;

  try {
    await Payroll.findByIdAndUpdate(id, req.body);
    res.json({ message: "Persona actualizada" });
  } catch (error) {
    res.json({
      message: `error intentando actualizar la persona con id ${id}`,
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
    const persons = await Payroll.find({grupo:nameGroup}).sort({subGrupo:1});
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

//Listar payroll por id de grupo
export const showPersonsByIdGroup = async (req, res) => {
  const {nameGroup} = req.params;
  

  try {
    const persons = await Payroll.find({grupoID:nameGroup}).sort({subGrupo:1});
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