/*
  Archivo con la logica y ejecución de todos los procesos que interactuan con
  la base de datos con respecto a los stacks definidos en rotations
*/

import Stacks from "../models/Stacks";

//Crear un nuevo registro Stack
export const createRegStack = async (req, res) => {

    //validacion
    let ID_ESQUEMA = req.body.idschema;
    let ORDER = req.body.order;
    let ID_PROGRAMA = req.body.idprograma;
    let TYPE = req.body.type;
    let VALUE = req.body.valor;
    let DURATION = req.body.duration;

    console.log(" dato 1 "+ ID_ESQUEMA);
    console.log(" dato 2 "+ ORDER);
    console.log(" dato 3 "+ ID_PROGRAMA);
    console.log(" dato 4 " + VALUE);
    console.log(" dato 5 " + DURATION);

    if (ID_ESQUEMA==null || ORDER==null || ID_PROGRAMA==null || TYPE == null) 
    {
        return res.status(400).send({
          message: 
           "MY ERROR --No se ha suministrado a la API la información necesaria para crear el registro--",
        });
    }

    else{

        //Si todo marcha bien y se suministro la informacion para ingresar a la DB
        try { 
            const newReg = new Stacks({
                ID_esquema : req.body.idschema,
                Type: req.body.type,
                Order : req.body.order,
                ID_programa : req.body.idprograma,
                Value:req.body.valor,
                Duration:req.body.duration
                });
        
                const newRegSaved = await newReg.save();
                res.json(newRegSaved );

            } catch (error) {
            res.status(500).json({
              message: error.message + " MY ERROR --Error intentando crear el registro Stacks--",
            });
          }
    }
}

//Listar todos los registros existentes 
export const findAllReg = async (req, res) =>{

  try {
  
      const allReg = await Stacks.find().sort({Order:1});
      res.json(allReg);
      
      if(allReg.length==0)
      {
        console.log("No hay registros para mostrar");
      }
  
    } catch (error) {
      res.status(500).json({
        message: "error intentando listar la información referente a Stacks",
      });
    }
}

//Listar los registros existentes segun id del esquema ordenados ascendentemente
export const findRegStackByID = async (req, res) =>{

    const {id} = req.params;
    console.log("El id de esquema es..."+id);

    try {
    
        const allReg = await Stacks.find({ID_esquema:id}).sort({Order:1});
        res.json(allReg);
        
        if(allReg.length==0)
        {
          console.log("No hay registros para mostrar");
        }
    
      } catch (error) {
        res.status(500).json({
          message: "error intentando listar la información referente a Stacks",
        });
      }
}

//Eliminar un item id
export const deleteItem = async (req, res) => {
  const { id } = req.params;

  try {
    const data = await Stacks.findByIdAndDelete(id);
    res.json({
      message: `Registro con el id ${data.nombre} .Eliminada correctamente`,
    });
  } catch (error) {
    res.json({
      message: `error eliminando el registro con id ${id}`,
    });
  }
};

//Eliminar todos los registros por id de schema
export const deleteAllItems = async (req, res) => {
  const { id } = req.params;

  try {
    const data = await Stacks.deleteMany({ID_esquema:id});
    res.json({
      message: `Registro con el id ${data.nombre} .Eliminada correctamente`,
    });
  } catch (error) {
    res.json({
      message: `error eliminando el registro con id ${id}`,
    });
  }
};


//Actualizar dia ORDER de un docuemto
export const updateOrder = async (req, res) => {
  const { id } = req.params;
  const newOrder = req.body.nuevo;

  console.log("El nuevo es.."+newOrder);

  const filter = { _id: id};
  const update = { Order: parseInt(newOrder)};

  try {
    await Stacks.findOneAndUpdate(filter, update);
    res.json({ message: "Registro actualizado" });
  } catch (error) {
    res.json({
      message: `error intentando actualizar el registro`,
    });
  }

};