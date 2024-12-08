/*
  Archivo que tendra las rutas de la RestApi para rotationsManager
*/

import { Router } from "express";
import * as rotationmanagerController from "../controllers/rotationsManager.controller";
const router = Router();

/* POST - CREAR REGISTRO ROUTERCONTROLLER */
router.post("/", rotationmanagerController.createRotationsManager);

/* POST - LISTAR TODOS LOS REGISTROS*/
router.get("/", rotationmanagerController.findAllReg);

/* GET - ENCONTRAR UN GRUPO POR ID*/
//router.get("/:id", groupController.findOneGroup);

/*  DELETE - ELIMINAR UN GRUPO POR ID*/
router.delete("/", rotationmanagerController.deleteAll);

/* PUT - ACTUALIZAR DIA CLAVE EN UN GRUPO */
router.put("/:idG",rotationmanagerController.updateDayKey);

/* PUT - ACTUALIZAR DOTOS TOTALES EN UN GRUPO */
router.put("/update/:idUs",rotationmanagerController.updateSingleData);

export default router;
