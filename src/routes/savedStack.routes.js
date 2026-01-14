/*
  Archivo que tendra los stacks guardados
*/

import { Router } from "express";
import * as saved from "../controllers/savedStack.controller";
import savedStacks from "../models/SavedStack";
const router = Router();

/* POST - CREAR UN PERMISO */
router.post("/", saved.createSaveStack);

/* GET - LISTAR TODOS LOS TURNOS DE UN USUARIO SEGUN UD DE USUARIO Y UNA FECHA ESFECIFICA*/
router.get("/", saved.findAllREg);

/* GET - LISTAR TODOS LOS TURNOS DE UN USUARIO SEGUN UD DE USUARIO Y UNA FECHA ESFECIFICA*/
router.get("/corto", saved.findRegByName);

/*  UPDATE - ACTUALIZAMOS EL NOMBRE DE UN SAVETACK*/
router.put("/:id",saved.updateSaveStack);

/* DELETE - ELIMINAR TODOS LOS REGISTROS POR SU NOMBRE */
router.delete("/:id",saved.deleteStackSaved);

/* POST - LISTAR TODOS LOS PERMISOS DE UN USUARIO EN ESPECIFICO POR SU ID EN UN AÑO ESPECIFICO*/
//router.get("/:id", shiftController.findAllPermissionsUser);



//----------------------------------------------------------------------------------------
//CONSULTAS ESPECIALES
//----------------------------------------------------------------------------------------



export default router;