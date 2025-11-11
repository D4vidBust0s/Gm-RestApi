/*
  Archivo que tendra las anotaciones diarias de un trabajador
*/

import { Router } from "express";
import * as notationsController from "../controllers/notations.controller";
import Notations from "../models/Notations";
const router = Router();

/* POST - CREAR UNA ANOTACION */
router.post("/", notationsController.createNotation);

/* GET - LISTAR TODAS LAS ANOTACIONES POR ID DE USUARIO*/
router.get("/", notationsController.findNotationsIdDate);

/* PUT - ACTUALIZAR UN REGISTRO EL CONTENIDO DE UNA ANOTACION SEGUN SU ID */
router.put("/",notationsController.updateNotation);

/*  DELETE - ELIMINAR UN GRUPO POR ID*/
router.delete("/",notationsController.deleteNotation);

/* POST - LISTAR TODOS LOS PERMISOS DE UN USUARIO EN ESPECIFICO POR SU ID EN UN AÑO ESPECIFICO*/
//router.get("/:id", shiftController.findAllPermissionsUser);



//----------------------------------------------------------------------------------------
//CONSULTAS ESPECIALES
//----------------------------------------------------------------------------------------



export default router;