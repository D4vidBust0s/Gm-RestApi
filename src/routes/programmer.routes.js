/*
  Archivo que tendra las rutas de API para el programmador
*/

import { Router } from "express";
import * as programmerController from "../controllers/programmer.controller";
import Programmer from "../models/Programmer";
const router = Router();

/* POST - CREAR UN PROGRAMMER */
router.post("/", programmerController.createProgrammer);

/* GET - LISTAR TODOS LOS REGISTROS*/
router.get("/", programmerController.findProgrammerByDate);

/*  DELETE - ELIMINAR UN GRUPO POR ID*/
router.delete("/:idP",programmerController.deleteProgrammer);

/* PUT - ACTUALIZAR UN REGISTRO POR SU ID */
router.put("/:id",programmerController.updateProgrammer);






//----------------------------------------------------------------------------------------
//CONSULTAS ESPECIALES
//----------------------------------------------------------------------------------------



export default router;