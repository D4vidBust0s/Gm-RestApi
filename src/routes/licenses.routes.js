/*
  Archivo que tendra las rutas de la RestApi para los registros de licensias de un trabajador
*/

import { Router } from "express";
import * as licemsesController from "../controllers/licenses.controller";
import Permission from "../models/Permissions";
const router = Router();

/* POST - CREAR UN REGISTRO DE LICENSIA */
router.post("/", licemsesController.createLicense);

/* POST - LISTAR TODAS LAS LICENCIAS DE UN */
router.get("/", licemsesController.findAllLicenses);

/* POST - LISTAR TODAS LAS LICENCIAS DE UN USUARIO EN ESPECIFICO POR SU ID EN UN AÑO ESPECIFICO*/
router.get("/:id", licemsesController.findAllLicensesUser);

/* PUT - ACTUALIZAR UN REGISTRO DE LICENCIA DE UN USUARIO */
router.put("/:id",licemsesController.updateLicense);

/*  DELETE - ELIMINAR UN REGISTRO DE LICENCIA POR ID*/
router.delete("/:id",licemsesController.deleteLicense);

//----------------------------------------------------------------------------------------
//CONSULTAS ESPECIALES
//----------------------------------------------------------------------------------------



export default router;