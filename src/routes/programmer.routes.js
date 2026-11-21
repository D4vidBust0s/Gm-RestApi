/*
  Archivo que tendra las rutas de API para el programmador
*/

import { Router } from "express";

import * as programmerController from "../controllers/programmer.controller";
import { requireGestor } from "../middlewares/requireGestor";

const router = Router();

/* GET - AÑOS CON REQUERIMIENTOS (ARCHIVO) */
router.get("/years", programmerController.findProgrammerYears);

/* GET - LISTAR POR FECHA, AÑO, TODAS O SOLO APROBADOS */
router.get("/", programmerController.findProgrammerByDate);

/* POST - CREAR UN REQUERIMIENTO */
router.post("/", requireGestor, programmerController.createProgrammer);

/* PUT - APROBAR / RECHAZAR / SOLICITAR REVISIÓN */
router.put(
  "/:id/decision",
  requireGestor,
  programmerController.decideProgrammer
);

/* PUT - ASIGNAR PERSONAL REAL A UN GRUPO REQUERIDO */
router.put(
  "/:id/personal/:rolId/asignados",
  requireGestor,
  programmerController.assignProgrammerPersonnel
);

/* PUT - ACTUALIZAR O REABRIR UN REQUERIMIENTO */
router.put("/:id", requireGestor, programmerController.updateProgrammer);

/* DELETE - ELIMINAR UN REQUERIMIENTO EN CUALQUIER ESTADO */
router.delete("/:idP", requireGestor, programmerController.deleteProgrammer);

export default router;
