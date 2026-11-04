import { Router } from "express";
import { loginUser, updateUser, getUsers } from "../controllers/auth.controller"; // Importamos getUsers

const router = Router();

router.post("/login", loginUser);
router.get("/users", getUsers);                  // <-- RUTA NUEVA para listar usuarios
router.put("/user/:id", updateUser);

export default router;