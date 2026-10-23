import { Router } from "express";
import { loginUser, updateUser } from "../controllers/auth.controller";

const router = Router();

router.post("/login", loginUser);
router.put("/user/:id", updateUser); // <-- RUTA AÑADIDA para actualizar el perfil del usuario

export default router;