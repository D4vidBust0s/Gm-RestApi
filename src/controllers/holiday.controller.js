/*
  Archivo con la logica y ejecución de todos los procesos que interactuan con
  la base de datos con respecto a los dias festivos o Holidays
*/


import Holidays from "../models/Holidays";

//Crear un nuevo registro holiday
export const createHoliday = async (req, res) => {
  //validacion
  let Nombre = req.body.nombre;
  let Mes = 1; //por alguna razon en cero da error por eso lo deje en 1
  let Año = req.body.año;


  if (!Nombre || !Mes || !Año) {
    return res.status(400).send({
      message: 
       "MY ERROR --No se ha suministrado a la API la información necesaria para crear el registro--",
    });
  }

  try {
    const newHoliday = new Holidays({
      Nombre: req.body.nombre,
      Mes: req.body.mes,
      Año: req.body.año,
      Dias: req.body.dias,
    });

    const holidaySaved = await newHoliday.save();
    res.json(holidaySaved);
  } catch (error) {
    res.status(500).json({
      message: error.message + " MY ERROR --Error intentando crear el registro holiday--",
    });
  }

};


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


/*
//Listar todas los grupos
export const findAllGroups = async (req, res) => {
  try {
    const group = await Group.find();
    res.json(group);
  } catch (error) {
    res.status(500).json({
      message: "error intentando listar los grupos",
    });
  }
};

*/

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