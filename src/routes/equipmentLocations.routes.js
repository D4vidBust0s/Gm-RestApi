import { Router } from "express";

import * as locationController from "../controllers/equipmentLocation.controller";
import { requireInventoryAccess } from "../middlewares/requireInventoryAccess";

const router = Router();

router.get("/", locationController.findAllLocations);
router.post("/", requireInventoryAccess, locationController.createLocation);
router.put("/:id", requireInventoryAccess, locationController.updateLocation);
router.delete("/:id", requireInventoryAccess, locationController.deleteLocation);

export default router;
