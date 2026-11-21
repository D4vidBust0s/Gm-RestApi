import { Router } from "express";

import * as incidentController from "../controllers/equipmentIncident.controller";
import { requireAlmacen } from "../middlewares/requireAlmacen";
import { requireInventoryAccess } from "../middlewares/requireInventoryAccess";

const router = Router();

router.get("/", requireInventoryAccess, incidentController.findIncidents);
router.get(
  "/:id",
  requireInventoryAccess,
  incidentController.findIncidentById
);
router.post(
  "/:id/notas",
  requireAlmacen,
  incidentController.addIncidentNote
);
router.patch(
  "/:id/cerrar",
  requireAlmacen,
  incidentController.closeIncident
);

export default router;
