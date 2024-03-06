/*
  Archivo que tendra las rutas de la RestApi para las vacaciones de un trabajador
*/

import { Router } from "express";
import * as recessController from "../controllers/recess.controller";
import Recess from "../models/Recess";
const router = Router();

/* POST - CREAR UN REGISTRO DE VACACIONES */
router.post("/", recessController.createRecess);

/* POST - LISTAR TODOS LOS REGISTROS DE VACACIONES SIN NINGUN FILTRO*/
router.get("/", recessController.findAllRecess);

/* POST - LISTAR TODOS LOS REGISTROS DE VACACIONES DE UN USUARIO EN ESPECIFICO POR SU ID EN UN AÑO ESPECIFICO*/
router.get("/:id", recessController.findAllRecessUser);

/* PUT - ACTUALIZAR UN REGISTRO DE VACACIONES DE UN USUARIO */
router.put("/:id",recessController.updateRecess);

/*  DELETE - ELIMINAR UN REGISTRO DE VACACIONES POR ID*/
router.delete("/:id",recessController.deleteRecess);

//----------------------------------------------------------------------------------------
//CONSULTAS ESPECIALES
//----------------------------------------------------------------------------------------



export default router;