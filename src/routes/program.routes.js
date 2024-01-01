/*
  Archivo que tendra las rutas de la RestApi para los programas fijos del canal
*/

import { Router } from "express";
import * as programController from "../controllers/program.controller";
import Programs from "../models/Programs";
const router = Router();

/* POST - CREAR PROGRAMA */
router.post("/", programController.createProgram);

/* GET - LISTAR TODOS LOS PROGRAMAS */
router.get("/", programController.findAllPrograms);

/* GET - LISTAR TODOS LOS PROGRAMAS PERO SOLO ENTRE SEMANA*/
router.get("/semanal", programController.findAllProgramsWeekDay);

/* GET - LISTAR TODOS LOS PROGRAMAS PERO SOLO FIN DE SEMANA*/
router.get("/findesemana", programController.findAllProgramsWeekend);

/*  DELETE - ELIMINAR UN PROGRAMA POR ID */
router.delete("/:id", programController.deleteProgram); 

/* GET - ENCONTRAR UN PROGRAMA POR ID */
router.get("/:id",programController.findOneProgram);

/* PUT - ACTUALIZAR UN PROGRAMA */
router.put("/:id",programController.updateProgram);


export default router;