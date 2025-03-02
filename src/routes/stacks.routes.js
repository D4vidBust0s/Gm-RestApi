/*
  Archivo que tendra las rutas de la RestApi para los dias festivos
*/

import { Router } from "express";
import * as stackyController from "../controllers/stacks.controller";
import Stacks from "../models/Stacks";
const router = Router();

/* POST - CREAR REGISTRO STACK */
router.post("/", stackyController.createRegStack);

/* GET - LISTAR TODOS LOS REGISTROS */
router.get("/", stackyController.findAllReg);

/* GET - LISTAR TODOS LOS REGISTROS FILTRADOS POR ID DE ESQUEMA*/
router.get("/:id", stackyController.findRegStackByID);

/* DELETE - ELIMINAR UN REGISTRO DE STACK*/
router.delete("/:id", stackyController.deleteItem);

/* DELETE - ELIMINAR TODOS LOS REGISTROS POR ID DE SCHEMA*/
router.delete("/deleteall/:id", stackyController.deleteAllItems);

/* PUT - ACTUALIZAR EL ORDER DE UN ELEMENTO  */
router.put("/:id",stackyController.updateOrder);



export default router;
