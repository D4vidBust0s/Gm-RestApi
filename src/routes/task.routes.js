/*
  Archivo que tendra las rutas de la RestApi para las tareas
*/

import { Router } from "express";
import * as taskControllers from "../controllers/tasks.controller";
const router = Router();

/* POST - CREAR TAREA */
router.post("/", taskControllers.createTask);

/* GET - LISTAR TODAS LAS TAREAS*/
router.get("/", taskControllers.findAllTasks);

/* GET - LISTAR SOLO TAREAS COMPLETADAS*/
router.get("/done", taskControllers.findAllDoneTask);

/* GET - ENCONTRAR UNA TAREA POR ID */
router.get("/:id", taskControllers.findOneTask);

/* DELETE - BORRAR TAREA POR ID */
router.delete("/:id", taskControllers.deleteTask);

/* PUT - ACTUALIZAR TAREA POR ID */
router.put("/:id", taskControllers.updateTask);

export default router;
