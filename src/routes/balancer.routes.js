/*
  Archivo que tendra las rutas de la RestApi para el balancer
*/

import { Router } from "express";
import * as balancerController from "../controllers/balancer.controller";
import Groups from "../models/Balancer";
const router = Router();

/* POST - CREAR REGISTRO BALANCER */
router.post("/", balancerController.createBalancer);

/* POST - LISTAR TODOS LOS GRUPOS*/
//router.get("/", groupController.findAllGroups);

/* GET - ENCONTRAR UN GRUPO POR ID*/
//router.get("/:id", groupController.findOneGroup);

/*  DELETE - ELIMINAR UN GRUPO POR ID*/
//router.delete("/:id", groupController.deleteGroup);

/* PUT - ACTUALIZAR UN GRUPO */
//router.put("/:id",groupController.updateGroup);

export default router;
