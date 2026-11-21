import { Router } from "express";

import * as departmentController from "../controllers/department.controller";
import { requireGestor } from "../middlewares/requireGestor";

const router = Router();

router.get("/", departmentController.findAllDepartments);
router.post("/", requireGestor, departmentController.createDepartment);
router.put("/:id", requireGestor, departmentController.updateDepartment);
router.delete("/:id", requireGestor, departmentController.deleteDepartment);

export default router;
