/*
  Archivo que tendrá las rutas de la RestApi para las proyecciones de horas de un trabajador
*/

import { Router } from "express";
import * as ProjectionController from "../controllers/projection.controller";
const router = Router();

/* POST - CREAR O ACTUALIZAR UN REGISTRO DE PROYECCIÓN */
router.post("/", ProjectionController.guardarProyeccion);

/* GET - LISTAR TODAS LAS PROYECCIONES */
router.get("/", ProjectionController.obtenerProyecciones);

export default router;