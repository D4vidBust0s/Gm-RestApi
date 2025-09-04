/*
  Archivo que tendra las rutas para operaciones con respecto a las sustituciones temporales
*/

import { Router } from "express";
import * as substitutionsController from "../controllers/substitutions.controller";
import Substitutions from "../models/Substitutions";
const router = Router();

/* POST - CREAR REGISTRO */
router.post("/", substitutionsController.createSubstitution);

/* GET - LISTAR TODOS LOS REGISTROS*/
router.get("/", substitutionsController.findAllReg);

/*  DELETE - ELIMINAR UN GRUPO POR ID*/
router.get("/:id",substitutionsController.findNameById);

/*  DELETE - ELIMINAR UN GRUPO POR ID*/
router.delete("/:id",substitutionsController.deleteReg);


/* GET - LISTAR TODOS LOS TURNOS DE UN USUARIO SEGUN UD DE USUARIO Y UNA FECHA ESFECIFICA*/
//router.get("/full", shiftController.findShiftsFull);

/* POST - LISTAR TODOS LOS PERMISOS DE UN USUARIO EN ESPECIFICO POR SU ID EN UN AÑO ESPECIFICO*/
//router.get("/:id", shiftController.findAllPermissionsUser);

/* PUT - ACTUALIZAR UN REGISTRO DE PERMISO DE UN USUARIO */
//router.put("/:id",shiftController.updatePermiso);



//----------------------------------------------------------------------------------------
//CONSULTAS ESPECIALES
//----------------------------------------------------------------------------------------



export default router;