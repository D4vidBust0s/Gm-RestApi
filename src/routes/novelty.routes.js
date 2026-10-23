/*
  Archivo que contiene las rutas de la REST API para las Novedades
*/

import { Router } from "express";
import * as noveltyController from "../controllers/novelty.controller";

const router = Router();

/* POST - CREAR NUEVA NOVEDAD */
router.post("/", noveltyController.createNovelty);

/* GET - LISTAR TODAS LAS NOVEDADES (Soporta ?grupoID=...) */
router.get("/", noveltyController.findAllNovelties);

/* GET - ENCONTRAR UNA NOVEDAD POR ID */
router.get("/:id", noveltyController.findOneNovelty);

/* PUT - RESOLVER UNA NOVEDAD */
router.put("/:id/resolve", noveltyController.resolveNovelty);

/* DELETE - ELIMINAR UNA NOVEDAD POR ID */
router.delete("/:id", noveltyController.deleteNovelty);

export default router;