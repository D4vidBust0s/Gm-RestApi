/*
  Archivo con la logica y ejecución de todos los procesos que interactuan con
  la base de datos con respecto a los stacks guardados 
*/

import StackSaved from "../models/Stacks-Saved";

//Crear un nuevo registro Stack
export const createRegStackSaved = async (req, res) => {

    //validacion
    let NOMBRE = req.body.namestack;
    let STACK = req.body.stack;
    
   

    console.log(" Nombre Stack "+ NOMBRE);
    console.log(" Stack "+ STACK);

    if (NOMBRE==null || STACK==null) 
    {
        return res.status(400).send({
          message: 
           "MY ERROR --No se ha suministrado a la API la información necesaria para crear el registro--",
        });
    }

    else{

        //Si todo marcha bien y se suministro la informacion para ingresar a la DB
        try { 
            const newReg = new StackSaved({
                    NameStack: NOMBRE,
                    Stack:STACK,
                });
        
                const newRegSaved = await newReg.save();
                res.json(newRegSaved );

            } catch (error) {
            res.status(500).json({
              message: error.message + " MY ERROR --Error intentando crear el registro Stacks Saved--",
            });
          }
    }
}


//Listar todos los registros existentes 
export const findAllReg = async (req, res) =>{

  try {
  
      const allReg = await StackSaved.find().sort({Order:1});
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
export const deleteStack = async (req, res) => {
  const { id } = req.params;

  try {
    const data = await StackSaved.findByIdAndDelete(id);
    res.json({
      message: `Registro con el id ${data.nombre} .Eliminada correctamente`,
    });
  } catch (error) {
    res.json({
      message: `error eliminando el registro con id ${id}`,
    });
  }
};



/*
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
*/
