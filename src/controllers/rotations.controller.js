/*
  Archivo con la logica y ejecución de todos los procesos que interactuan con
  la base de datos con respecto a las rotaciones de los grupos ya definidos, tanto para dias entre semana
  como para los fines de semana
*/


import Rotation from "../models/Rotations";

//Crear un nuevo registro de rotaciones para un grupo
export const createEntreSemana = async (req, res) => {
  //validacion
  let Nombre = req.body.nombre;
  let H_inicio = req.body.hinicio;
  let H_fin = req.body.hfin;
  let Grupo_id = req.body.grupoid;
  let Tipo = req.body.tipo;
  let Order = req.body.order;


  if (!Nombre || !H_inicio || !H_fin  || !Grupo_id || !Tipo || !Order) {
    return res.status(400).send({
      message: 
       "MY ERROR --No se ha suministrado a la API la información necesaria para crear el registro--",
    });
  }

  try { 
    const newRotationEntre = new Rotation({
      Nombre: req.body.nombre,
      HoraInicio: req.body.hinicio,
      HoraFinal: req.body.hfin,
      Grupo_ID: req.body.grupoid,
      Tipo: req.body.tipo,
      Order: req.body.order,
      Excluir: req.body.excluir,
      Descanso: req.body.descanso
    });

    const newRotationEntreSaved = await newRotationEntre.save();
    res.json(newRotationEntreSaved);
  } catch (error) {
    res.status(500).json({
      message: error.message + " MY ERROR --Error intentando crear el registro Rotations--",
    });
  }

};

//Listar los registros existentes el id del grupo ordenados ascendentemente
export const getAll = async (req, res) => {

  
    console.log("Trayendo todos los registros");

  try {
    
    const allReg = await Rotation.find().sort({Order:1});
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


//Listar los registros existentes el id del grupo ordenados ascendentemente
export const findAllRegGroupsById = async (req, res) => {

  const {ID} = req.params;
  
    console.log("El id de grupo es..."+ID);

  try {
    
    const allReg = await Rotation.find({Grupo_ID:ID,Tipo:"Entre Semana"}).sort({Order:1});
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

//Listar los registros existentes el id del grupo ordenados ascendentemente
export const findAllRegGroupsByIdFs = async (req, res) => {

  const {ID} = req.params;
  
    console.log("El id de grupo es..."+ID);

  try {
    
    const allReg = await Rotation.find({Grupo_ID:ID,Tipo:"Fin de Semana"}).sort({Order:1});
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


//Listar los registros existentes el id del grupo ordenados ascendentemente
export const findHorainicioItemById = async (req, res) => {

  const {id} = req.params;
  
    console.log("El id de item es..."+id);

  try {
    
    const allReg = await Rotation.find({_id:id},{_id:0,HoraInicio:1});
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

//Actualizar un registro por id de registro
export const actualizarSchema = async (req, res) => {
  const { id_registro } = req.body;
  const { nombreActual } = req.body;
  const { nuevaHoraInicio } = req.body;
  const { nuevaHoraFinal } = req.body;
  const { nuevoNombre } = req.body;
  const { order } = req.body;
  const {excluir} = req.body;
  const {descanso} = req.body;

  console.log("Entrando a la zona de actualización del Schema")
  
  
  try {
    await Rotation.updateMany({_id:id_registro,Nombre:nombreActual},{$set:{Nombre:nuevoNombre,HoraInicio:nuevaHoraInicio,HoraFinal:nuevaHoraFinal,Order:order,Excluir:excluir,Descanso:descanso}});
    res.json({ message: "Registro actualizado" });
  } catch (error) {
    res.json({
      message: `error intentando actualizar el dia ${dias}`,
    });
  }
  
};

//Eliminar un grupo por id
export const delReg = async (req, res) => {
  const { idreg } = req.body;

  console.log("Entrando a la zona de eliminación de registros con id:" + idreg);
  
  try {
    const data = await Rotation.findByIdAndDelete(idreg);
    res.json({
      message: `Registro con el id ${idreg} .Eliminado correctamente`,
    });
  } catch (error) {
    res.json({
      message: `error eliminando el registro con id ${idreg}`,
    });
  }

};


/*
//Listar un registro por mes
export const findOneRegMes = async (req, res) => {
  const { mes } = req.params;
  let año = req.query.Año;

  try {

    console.log("El mes es..."+mes)

    const oneRegistro = await Holidays.find({Mes:mes,Año:año});
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

//Listar un registro por dia
export const findOneRegDia = async (req, res) => {
  const { dias } = req.params;
  let mes  = req.query.Mes;
  let año  = req.query.Año;
  
    console.log("El dia es..."+dias);

  try {
    
    const oneDay = await Holidays.find({"Dias.dia":parseInt(dias),Mes:parseInt(mes),Año:parseInt(año)});
    res.json(oneDay);
    
    if(oneDay.length==0)
    {
      console.log("No hay registros para mostrar");
    }

  } catch (error) {
    res.status(500).json({
      message: "error intentando listar la información",
    });
  }

};
*/

/*
//Actualizar dia en el mes y año correspondiente a la seleccion del usuario
export const updateReg = async (req, res) => {
  const { dias } = req.params;
  const { motivo } = req.body;
  const { mes } = req.body;
  const { año } = req.body;

  try {
    await Holidays.updateOne({Mes:parseInt(mes),Año:parseInt(año)},{$push:{Dias:{dia:parseInt(dias) , motivo:motivo}}});
    res.json({ message: "Registro actualizado" });
  } catch (error) {
    res.json({
      message: `error intentando actualizar el dia ${dias}`,
    });
  }

};
*/

/*
//Actualizar el motivo de un registro holiday 
export const updateMotivo = async (req, res) => {
  const { dias } = req.body;
  const { mes } = req.body;
  const { año } = req.body;
  const { motivo } = req.body;
  
  try {
    await Holidays.updateMany({Mes:mes,Año:año,"Dias.dia":parseInt(dias)},{$set:{"Dias.$.motivo":motivo}});
    res.json({ message: "Registro actualizado" });
  } catch (error) {
    res.json({
      message: `error intentando actualizar el dia ${dias}`,
    });
  }
};
*/

/*
//Actualizar el motivo de un registro holiday 
export const deleteReg = async (req, res) => {
  const { dias } = req.body;
  const { mes } = req.body;
  const { año } = req.body;
  const { motivo } = req.body;
  
  try {
    await Holidays.updateOne({Mes:parseInt(mes),Año:año},{$pull:{Dias:{dia:parseInt(dias)}}});
    res.json({ message: "Registro eliminado" });
  } catch (error) {
    res.json({
      message: `error intentando eliminar el dia ${dias}`,
    });
  }
};
*/

/*
//Actualizar dia en el mes y año correspondiente a la seleccion del usuario
export const clonar = async (req, res) => {
  const { an1 } = req.body;
  const { an2 } = req.body;
  const { ex } = req.body;

     console.log("El año original es.." + an1);
     console.log("El año a cambiar es.." + an2);
     console.log("Existe " + ex);

  try {

    if(parseInt(ex)==0)
    {
      const query = await Holidays.find({Año:an1},{Nombre:1,Mes:1,Año:1,Dias:1,createdAt:1,updatedAt:1,_id:0});
    
      await query?.map((registro)=>{
        registro.Año=an2;
      })

      await Holidays.insertMany(query);
      console.log("SE INSERTO");
    }
    else{
      console.log("NO SE ACTUALIZA POR QUE LA CLONACION YA SE HABIA REALIZADO");
    }
    

    res.json(query);
  } catch (error) {
    res.json({
      message: `error intentando clonar los años ${an1} y ${an2}`,
    });
  }

};
*/


/*
//Listar un registro Holiday por año
export const findOneHoliday = async (req, res) => {
  const {year} = req.params;
  console.log("el año es..." + year);

  try {
    const oneHoliday = await Holidays.find({Año:year}).sort({Mes:1});
    
    if (!oneHoliday)
      return res.status(404).json({
        message: `El Registro Holiday con el año ${year} no existe`,
      });
    res.json(oneHoliday);
  } catch (error) {
    res.status(500).json({
      message:
        error.message + `MY ERROR -- Error trayendo la informacion del registro Holiday con año ${year} --`,
    });
  }
};
/*

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


/*
//Actualizar dia en el mes y año correspondiente a la seleccion del usuario
export const updateReg = async (req, res) => {
  const { dias } = req.params;

  const filter = { Mes: MES, Año: AÑO};
  const update = { Dias: [{dia:parseInt(dias)}]};

  try {
    await Holidays.findOneAndUpdate(filter, update);
    res.json({ message: "Registro actualizado" });
  } catch (error) {
    res.json({
      message: `error intentando actualizar el dia ${dias}`,
    });
  }

};
*/