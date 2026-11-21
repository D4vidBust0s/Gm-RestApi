import { Router } from "express";

import * as assignmentController from "../controllers/assignment.controller";
import { requireAlmacen } from "../middlewares/requireAlmacen";
import { requireInventoryAccess } from "../middlewares/requireInventoryAccess";

const router = Router();

// Lecturas: cualquier usuario con acceso al inventario y sesión válida.
router.get("/", requireInventoryAccess, assignmentController.findAssignments);
router.get(
  "/eventos",
  requireInventoryAccess,
  assignmentController.findAssignmentEvents
);
router.get(
  "/config",
  requireInventoryAccess,
  assignmentController.getAssignmentConfig
);
router.get(
  "/elegibles",
  requireInventoryAccess,
  assignmentController.findEligibleOrigins
);
router.get(
  "/elegibles/:origenTipo/:origenId",
  requireInventoryAccess,
  assignmentController.findEligibleOrigin
);
router.get(
  "/:id",
  requireInventoryAccess,
  assignmentController.findAssignmentById
);

// Escrituras: solo almacén.
router.post("/", requireAlmacen, assignmentController.createAssignment);
router.post(
  "/:id/aceptar",
  requireAlmacen,
  assignmentController.acceptAssignment
);
router.post(
  "/:id/reintentar-verificacion",
  requireAlmacen,
  assignmentController.retryAssignmentVerification
);
router.post(
  "/:id/descargar",
  requireAlmacen,
  assignmentController.downloadAssignment
);
router.post(
  "/:id/anular",
  requireAlmacen,
  assignmentController.cancelAssignment
);

export default router;
