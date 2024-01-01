/*
  Archivo que tendra las rutas de la RestApi para los grupos
*/

import { Router } from "express";
import * as groupController from "../controllers/group.controller";
import Groups from "../models/Groups";
const router = Router();

/* POST - CREAR GRUPO */
router.post("/", groupController.createGroup);

/* POST - LISTAR TODOS LOS GRUPOS*/
router.get("/", groupController.findAllGroups);

/* GET - ENCONTRAR UN GRUPO POR ID*/
router.get("/:id", groupController.findOneGroup);

/*  DELETE - ELIMINAR UN GRUPO POR ID*/
router.delete("/:id", groupController.deleteGroup);

/* PUT - ACTUALIZAR UN GRUPO */
router.put("/:id",groupController.updateGroup);

export default router;
