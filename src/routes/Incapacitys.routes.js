/*
  Archivo que tendra las rutas de la RestApi para los permisos de un trabajador
*/

import { Router } from "express";
import * as IncapacitysController from "../controllers/incapacitys.controller";
import Incapacitys from "../models/Incapacitys";
const router = Router();

/* POST - CREAR UN REGISTRO DE INCAPACIDAD */
router.post("/", IncapacitysController.createIncapacity);

/* POST - LISTAR TODAS LAS INCAPACIDADES SIN FILTROS */
router.get("/", IncapacitysController.findAllIncapacitys);

/* POST - LISTAR TODAS LAS INCAPACIDADES DE UN USUARIO EN ESPECIFICO POR SU ID EN UN AÑO ESPECIFICO*/
router.get("/:id", IncapacitysController.findAllIncapacitysUser);

/* PUT - ACTUALIZAR UN REGISTRO DE INCAPACIDAD DE UN USUARIO */
router.put("/:id",IncapacitysController.updateIncapacity);

/*  DELETE - ELIMINAR UN REGISTRO DE INCAPACIDAD POR ID*/
router.delete("/:id",IncapacitysController.deleteIncapacity);

//----------------------------------------------------------------------------------------
//CONSULTAS ESPECIALES
//----------------------------------------------------------------------------------------



export default router;