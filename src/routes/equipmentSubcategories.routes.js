import { Router } from "express";

import * as subcategoryController from "../controllers/equipmentSubcategory.controller";
import { requireInventoryAccess } from "../middlewares/requireInventoryAccess";

const router = Router();

router.get("/", subcategoryController.findAllSubcategories);
router.get("/:id/imagen", subcategoryController.getSubcategoryImage);
router.post("/", requireInventoryAccess, subcategoryController.createSubcategory);
router.put("/:id", requireInventoryAccess, subcategoryController.updateSubcategory);
router.delete(
  "/:id/imagen",
  requireInventoryAccess,
  subcategoryController.deleteSubcategoryImage
);
router.delete("/:id", requireInventoryAccess, subcategoryController.deleteSubcategory);

export default router;
