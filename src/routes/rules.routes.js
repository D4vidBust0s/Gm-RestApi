/*
  Archivo que tendra las rutas de la RestApi para las Reles o reglas 
*/

import { Router } from "express";
import * as rulesController from "../controllers/rules.controller";
import Rules from "../models/Rules";
const router = Router();

/* POST - CREAR GRUPO */
router.post("/", rulesController.createRule);

/* POST - LISTAR TODOS LOS GRUPOS*/
router.get("/", rulesController.findRules);

/* GET - ENCONTRAR UN GRUPO POR ID*/
//router.get("/:id", groupController.findOneGroup);

/*  DELETE - ELIMINAR UN GRUPO POR ID*/
//router.delete("/:id", groupController.deleteGroup);

/* PUT - ACTUALIZAR RULES */
router.put("/:id",rulesController.updateRules);

export default router;
