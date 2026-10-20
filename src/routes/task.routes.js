import { Router } from "express";
import { 
  getTasksByUser, 
  createTask, 
  updateTask, 
  deleteTask 
} from "../controllers/task.controller.js";

const router = Router();

// Ruta para obtener tareas por ID de usuario -> Se convierte en /api/tasks/user/:userId
router.get("/user/:userId", getTasksByUser);

// Ruta para crear tarea -> Se convierte en /api/tasks
router.post("/", createTask);

// Ruta para actualizar tarea -> Se convierte en /api/tasks/:id
router.put("/:id", updateTask);

// Ruta para eliminar tarea -> Se convierte en /api/tasks/:id
router.delete("/:id", deleteTask);

export default router;