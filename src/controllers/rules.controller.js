/*
  Archivo con la logica y ejecución de todos los procesos que interactuan con
  la base de datos con respecto a las Rules
*/

import Rules from "../models/Rules";

//Crear un nuevo registro de Reglas
export const createRule = async (req, res) => {
  //validacion
  if (!req.body.inDiaDeLaSemana || !req.body.inLaboralDiurna || !req.body.endLaboralDiurna || !req.body.inLaboralNocturna || !req.body.endLaboralNocturna) {
    return res.status(400).send({
      message:
        "No se han enviado los parametros correctos o alguno de ellos esta vacio",
    });
  }

  try {
    const newRule = new Rules({
        InDiaDeLaSemana: req.body.inDiaDeLaSemana,
        InLaboralDiurna: req.body.inLaboralDiurna,
        EndLaboralDiurna: req.body.endLaboralDiurna,
        InLaboralNocturna: req.body.inLaboralNocturna,
        EndLaboralNocturna: req.body.endLaboralNocturna,
    });

    const RuleSaved = await newRule.save();
    res.json(RuleSaved);
  } catch (error) {
    res.status(500).json({
      message: error.message || "Error intentando crear el grupo de reglas",
    });
  }
};


//Listar todas las rules
export const findRules = async (req, res) => {
  try {
    const rules = await Rules.find();
    res.json(rules);
  } catch (error) {
    res.status(500).json({
      message: "error intentando listar las rules",
    });
  }
};


/*
//Listar un Grupo por id
export const findOneGroup = async (req, res) => {
  const { id } = req.params;

  try {
    const oneGroup = await Group.findById(id);

    if (!oneGroup)
      return res.status(404).json({
        message: `El grupo con id ${id} no existe`,
      });
    res.json(oneGroup);
  } catch (error) {
    res.status(500).json({
      message:
        error.message + `Error trayendo la informacion del grupo con id ${id}`,
    });
  }
};

*/


/*
//Eliminar un grupo por id
export const deleteGroup = async (req, res) => {
  const { id } = req.params;

  try {
    const data = await Group.findByIdAndDelete(id);
    res.json({
      message: `Grupo con el nombre ${data.nombre} .Eliminada correctamente`,
    });
  } catch (error) {
    res.json({
      message: `error eliminando el grupo con id ${id}`,
    });
  }
};
*/


//Actualizar un grupo
export const updateRules = async (req, res) => {
  const { id } = req.params;

  try {
    await Rules.findByIdAndUpdate(id, req.body);
    res.json({ message: "Rules actualizadas" });
  } catch (error) {
    res.json({
      message: `error intentando actualizar las rules con id ${id}`,
    });
  }
};

