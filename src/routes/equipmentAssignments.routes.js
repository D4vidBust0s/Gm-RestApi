import { Router } from "express";

import * as assignmentController from "../controllers/equipmentAssignment.controller";
import { requireGestor } from "../middlewares/requireGestor";

const router = Router();

router.get("/", assignmentController.findAssignments);
router.patch(
  "/:id/liberar",
  requireGestor,
  assignmentController.releaseAssignment
);

export default router;
