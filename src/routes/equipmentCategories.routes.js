import { Router } from "express";

import * as categoryController from "../controllers/equipmentCategory.controller";
import { requireInventoryAccess } from "../middlewares/requireInventoryAccess";

const router = Router();

router.get("/", categoryController.findAllCategories);
router.get("/:id/imagen", categoryController.getCategoryImage);
router.post("/", requireInventoryAccess, categoryController.createCategory);
router.put("/:id", requireInventoryAccess, categoryController.updateCategory);
router.delete(
  "/:id/imagen",
  requireInventoryAccess,
  categoryController.deleteCategoryImage
);
router.delete("/:id", requireInventoryAccess, categoryController.deleteCategory);

export default router;
