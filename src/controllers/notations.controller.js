/*
  Archivo con la logica y ejecución de todos los procesos que interactuan con
  la base de datos con respecto las anotaciones diarias de los trabajadores
*/

import notations from "../models/Notations";

//Crear un nuevo turno para un trabajador
export const createNotation = async (req, res) => {

    console.log("ENTRANDO A LA ZONA DE CREACION DE UNA ANOTACION ");
    
  //validacion
  
  try {
    const newNotation = new notations({
        ID_user: req.body.iduser,
        Nombres: req.body.nombres,
        Estado:  req.body.estado,
        Contenido: req.body.contenido,
        Fecha_clave: req.body.fecha,
    });

    const notationSaved = await newNotation.save();
    res.json(notationSaved);
  } catch (error) {
    res.status(200).json({
      message: error.message || "Error intentando crear la anotacion",
    });
  }
};



//Listar turnos por id de usuario y fecha especifica
export const findNotationsIdDate = async (req, res) => {
  const id = req.query.id;
  const fecha = req.query.fecha;
  
  try {
    
    console.log("ENTRANDO A LA ZONA DE CONSULTA DE ANOTACIONES POR ID " + id + " Y CON FECHA " + fecha);
    
    
    const oneRegistro = await notations.find({ID_user:id, Fecha_clave:fecha});
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


//Actualizar el contenido de una anotacion
export const updateNotation = async (req, res) => {

  const { idnota } = req.body;
  const { contenido } = req.body;

  console.log("ID PARA ACTUALIZAR ANOTACION = "+ idnota);
  console.log("CONTENIDO = "+ contenido);

 


  try {
    await notations.updateOne({_id:idnota},{$set:{Contenido:contenido}}); 
    res.json({ message: "Actualizacion realizada" });
  } catch (error) {
    res.json({
      message: `error intentando actualizar la información con id de esquema ${idnota}`,
    });
  }
};




//Eliminar una anotacion por su id 
export const deleteNotation = async (req, res) => {
  const id = req.query.idnotation;  

  console.log("ENTRANDO A LA ZONA DE ELIMINACION DE ANOTACIONES... con id "  +id);
  
  try {
    const data = await notations.deleteMany({_id:id});
    res.json({
      message: `Registros con el nombre ${id} .Eliminados correctamente`,
    });
  } catch (error) {
    res.json({
      message: `error eliminando el registro con id ${id}`,
    });
  }

  
};


