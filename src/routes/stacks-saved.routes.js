/*
  Archivo que tendra las rutas de la RestApi para los esquemas guardados
*/

import { Router } from "express";
import * as stackSavedController from "../controllers/satack-saved.controller";
import StackSaved from "../models/Stacks-Saved";
const router = Router();

/* POST - CREAR REGISTRO STACK SAVED */
router.post("/", stackSavedController.createRegStackSaved);

/* GET - LISTAR TODOS LOS REGISTROS */
router.get("/", stackSavedController.findAllReg);

/* GET - LISTAR TODOS LOS REGISTROS FILTRADOS POR ID DE ESQUEMA*/
//router.get("/:id", stackyController.findRegStackByID);

/* DELETE - ELIMINAR UN REGISTRO HOLIDAY*/
router.delete("/:id", stackSavedController.deleteStack);

/* PUT - ACTUALIZAR EL MOTIVO TENIENDO DIA MES AÑO  */
//router.put("/",holidayController.updateMotivo);



export default router;
