import { Router } from "express";
import * as messageCtrl from "../controllers/message.controller";

const router = Router();

router.get("/", messageCtrl.getMessages);

export default router;