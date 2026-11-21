import { Router } from "express";

import * as equipmentController from "../controllers/equipment.controller";
import { requireInventoryAccess } from "../middlewares/requireInventoryAccess";

const router = Router();

// Rutas estáticas primero para que no las capture /:id.
router.get("/resumen", equipmentController.getEquipmentSummary);
router.get("/disponibilidad", equipmentController.getEquipmentAvailability);
router.get("/verificar-placa", equipmentController.checkEquipmentPlate);
router.get("/seguimientos", equipmentController.getPendingFollowups);

router.get("/", equipmentController.findEquipment);
router.get("/:id", equipmentController.findEquipmentById);
router.get("/:id/imagen", equipmentController.getEquipmentImage);
router.get("/:id/asignaciones", equipmentController.getEquipmentAssignments);
router.get("/:id/restricciones", equipmentController.listEquipmentRestrictions);

router.post("/", requireInventoryAccess, equipmentController.createEquipment);
router.put("/:id", requireInventoryAccess, equipmentController.updateEquipment);
router.patch(
  "/:id/estado",
  requireInventoryAccess,
  equipmentController.changeEquipmentState
);

router.post(
  "/:id/observaciones",
  requireInventoryAccess,
  equipmentController.addObservation
);
router.put(
  "/:id/observaciones/:observacionId",
  requireInventoryAccess,
  equipmentController.updateObservation
);
router.delete(
  "/:id/observaciones/:observacionId",
  requireInventoryAccess,
  equipmentController.deleteObservation
);

router.post(
  "/:id/restricciones",
  requireInventoryAccess,
  equipmentController.addRestriction
);
router.put(
  "/:id/restricciones/:restriccionId",
  requireInventoryAccess,
  equipmentController.updateRestriction
);
router.delete(
  "/:id/restricciones/:restriccionId",
  requireInventoryAccess,
  equipmentController.deleteRestriction
);

router.post(
  "/:id/mantenimientos",
  requireInventoryAccess,
  equipmentController.startMaintenance
);
router.patch(
  "/:id/mantenimientos/:mantenimientoId",
  requireInventoryAccess,
  equipmentController.finishMaintenance
);
router.post(
  "/:id/mantenimientos/:mantenimientoId/pasos",
  requireInventoryAccess,
  equipmentController.addMaintenanceStep
);
router.put(
  "/:id/mantenimientos/:mantenimientoId/pasos/:pasoId",
  requireInventoryAccess,
  equipmentController.updateMaintenanceStep
);
router.delete(
  "/:id/mantenimientos/:mantenimientoId/pasos/:pasoId",
  requireInventoryAccess,
  equipmentController.deleteMaintenanceStep
);
router.patch(
  "/:id/mantenimientos/:mantenimientoId/seguimiento",
  requireInventoryAccess,
  equipmentController.closeMaintenanceFollowup
);
router.post(
  "/:id/mantenimientos/:mantenimientoId/seguimiento/notas",
  requireInventoryAccess,
  equipmentController.addFollowupNote
);

router.get(
  "/:id/mantenimientos/:mantenimientoId/adjuntos",
  requireInventoryAccess,
  equipmentController.listMaintenanceAttachments
);
router.post(
  "/:id/mantenimientos/:mantenimientoId/adjuntos",
  requireInventoryAccess,
  equipmentController.addMaintenanceAttachments
);
router.put(
  "/:id/mantenimientos/:mantenimientoId/adjuntos/:adjuntoId",
  requireInventoryAccess,
  equipmentController.updateMaintenanceAttachment
);
router.delete(
  "/:id/mantenimientos/:mantenimientoId/adjuntos/:adjuntoId",
  requireInventoryAccess,
  equipmentController.deleteMaintenanceAttachment
);
router.get(
  "/:id/mantenimientos/:mantenimientoId/adjuntos/:adjuntoId/archivo",
  equipmentController.getMaintenanceAttachmentFile
);

export default router;
