import { Router } from "express";

import * as requirementController from "../controllers/requirement.controller";
import { requireGestor } from "../middlewares/requireGestor";

const router = Router();

router.get("/", requirementController.findRequirements);
router.get("/years", requirementController.findRequirementYears);
router.get("/resumen", requirementController.findRequirementSummary);

router.get("/:id", requirementController.findRequirementById);
router.get("/:id/equipos", requirementController.listRequirementEquipment);

router.post("/", requireGestor, requirementController.createRequirement);
router.put("/:id", requireGestor, requirementController.updateRequirement);
router.put(
  "/:id/decision",
  requireGestor,
  requirementController.decideRequirement
);
router.put(
  "/:id/personal/:rolId/asignados",
  requireGestor,
  requirementController.assignRequirementPersonnel
);
router.delete("/:id", requireGestor, requirementController.deleteRequirement);

export default router;
