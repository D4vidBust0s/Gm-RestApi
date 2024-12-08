/*
  Archivo con la logica y ejecución de todos los procesos que interactuan con
  la base de datos con respecto a la gestion de rotaciones de los trabajadores y sus grupos
*/


import RotationManager from "../models/RotationsManager";

//Crear un nuevo registro de rotaciones para un usuario
export const createRotationsManager = async (req, res) => {
  //validacion
  let NombreUsuario = req.body.nombreusuario;
  let UserId = req.body.userid;
  let GroupName = req.body.groupname;
  let GroupId = req.body.groupid;
  let SchemaName = req.body.schemaname;
  let SchemaId = req.body.schemaid;
  let TotalSchema = req.body.totalschema;
  let TotalGroup = req.body.totalgroup;
  let Actual = req.body.actual;
  let DayKey = req.body.dayKey;

/*
  if (!NombreUsuario || !UserId || !GroupName  || !GroupId || !SchemaName || !SchemaId || !TotalSchema || !TotalGroup || !Actual) {
    return res.status(400).send({
      message: 
       "MY ERROR --No se ha suministrado a la API la información necesaria para crear el registro--",
    });
  }

  */

  try { 
    
    const newRotationEntre = new RotationManager({

        userName: req.body.nombreusuario,
        userId: req.body.userid,
        groupName: req.body.groupname,
        groupId: req.body.groupid,
        SchemaName: req.body.schemaname,
        schemaId: req.body.schemaid,
        totalSchema: req.body.totalschema,
        totalGrupo: req.body.totalgroup,
        actual: req.body.actual,
        dayKey: req.body.dayKey,

    });

    const newRotationEntreSaved = await newRotationEntre.save();
    res.json(newRotationEntreSaved);
  } catch (error) {
    res.status(500).json({
      message: error.message + " MY ERROR --Error intentando crear el registro Rotations--",
    });
  }

};


//Listar los registros existentes el id del registro
export const findAllReg = async (req, res) => {

  
    console.log("ENTRANDO A LA ZONA GESTIONROTATIONS");

  try {
    
    const allReg = await RotationManager.find();
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


//Eliminar todos los documentos
export const deleteAll = async (req, res) => {
  
  console.log("Se eliminarán todos los datos de la collección RotationsManager");
  
  try {
    const data = await RotationManager.deleteMany({});
    res.json({
      message: `Documentos Eliminados correctamente`,
    });
  } catch (error) {
    res.json({
      message: `error intentando eliminar registros`,
    });
  }

};

//Actualizar el dia clave de todo el grupo
export const updateDayKey = async (req, res) => {
  const { idG } = req.params;
  const {newDayKey} = req.body;
  const {totalschema} = req.body;
  const {totalgrupo} = req.body;


  console.log("IDG = "+ idG);
  console.log("DAYKEY = "+ newDayKey);
  console.log("TS = "+ totalschema);
  console.log("TG = "+ totalgrupo);


  try {
    await RotationManager.updateMany({groupName:idG},{$set:{"dayKey":newDayKey,"totalGrupo":totalgrupo,"totalSchema":totalschema}}); 
    res.json({ message: "Dia clave actualizado" });
  } catch (error) {
    res.json({
      message: `error intentando actualizar el dia clave con id de grupo ${idG}`,
    });
  }
};


//Actualizar el dia clave de todo el grupo
export const updateSingleData = async (req, res) => {
  const { idUs } = req.params;
  const {nameschema} = req.body;
  const {actual} = req.body;
  const {idschema} = req.body;


  console.log("IDUSER = "+ idUs);
  console.log("NAMESCHEMA = "+ nameschema);
  console.log("ACTUAL = "+ actual);
  console.log("IDSCHEMA = "+ idschema);


  try {
    await RotationManager.updateOne({userId:idUs},{$set:{"SchemaName":nameschema,"schemaId":idschema,actual:actual}}); 
    res.json({ message: "Operacion realizada" });
  } catch (error) {
    res.json({
      message: `error intentando actualizar la información con id de usuario ${idUs}`,
    });
  }
};



/*
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
*/

/*

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

*/

/*

//Actualizar un registro por id de registro
export const actualizarSchema = async (req, res) => {
  const { id_registro } = req.body;
  const { nombreActual } = req.body;
  const { nuevaHoraInicio } = req.body;
  const { nuevaHoraFinal } = req.body;
  const { nuevoNombre } = req.body;
  const { order } = req.body;
  const {excluir} = req.body;

  console.log("Entrando a la zona de actualización del Schema")
  
  
  try {
    await Rotation.updateMany({_id:id_registro,Nombre:nombreActual},{$set:{Nombre:nuevoNombre,HoraInicio:nuevaHoraInicio,HoraFinal:nuevaHoraFinal,Order:order,Excluir:excluir}});
    res.json({ message: "Registro actualizado" });
  } catch (error) {
    res.json({
      message: `error intentando actualizar el dia ${dias}`,
    });
  }
  
};

*/





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