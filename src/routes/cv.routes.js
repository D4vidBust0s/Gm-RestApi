/*
  Archivo que tendrá las rutas de la RestApi para el historial de CV / Novedades de un trabajador
*/

import { Router } from "express";
import * as cvController from "../controllers/cv.controller";
const router = Router();

/* POST - CREAR UN REGISTRO EN EL CV */
router.post("/", cvController.createCvRecord);

/* GET - LISTAR TODOS LOS REGISTROS DE CV SIN FILTRO */
router.get("/", cvController.findAllCvRecords);

/* GET - LISTAR TODOS LOS REGISTROS DE CV DE UN USUARIO EN ESPECÍFICO POR SU ID Y AÑO */
router.get("/:id", cvController.findAllCvUser);

/* PUT - ACTUALIZAR UN REGISTRO DE CV POR ID */
router.put("/:id", cvController.updateCvRecord);

/* DELETE - ELIMINAR UN REGISTRO DE CV POR ID */
router.delete("/:id", cvController.deleteCvRecord);

export default router;