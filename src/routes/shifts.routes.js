/*
  Archivo que tendra los turnos de un trabajador
*/

import { Router } from "express";
import * as shiftController from "../controllers/shift.controller";
import Shifts from "../models/Shifts";
const router = Router();

/* POST - CREAR UN PERMISO */
router.post("/", shiftController.createShift);

/* GET - LISTAR TODOS LOS TURNOS DE UN USUARIO SEGUN UD DE USUARIO Y UNA FECHA ESFECIFICA*/
router.get("/", shiftController.findShiftsIdDate);

/* POST - LISTAR TODOS LOS PERMISOS DE UN USUARIO EN ESPECIFICO POR SU ID EN UN AÑO ESPECIFICO*/
//router.get("/:id", shiftController.findAllPermissionsUser);

/* PUT - ACTUALIZAR UN REGISTRO DE PERMISO DE UN USUARIO */
//router.put("/:id",shiftController.updatePermiso);

/*  DELETE - ELIMINAR UN GRUPO POR ID*/
//router.delete("/:id",shiftController.deletePermission);

//----------------------------------------------------------------------------------------
//CONSULTAS ESPECIALES
//----------------------------------------------------------------------------------------



export default router;