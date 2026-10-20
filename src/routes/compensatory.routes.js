/*
  Archivo que tendrá las rutas de la RestApi para los compensatorios de un trabajador
*/

import { Router } from "express";
import * as CompensatoryController from "../controllers/compensatory.controller";
const router = Router();

/* POST - CREAR UN REGISTRO DE COMPENSATORIO */
router.post("/", CompensatoryController.createCompensatory);

/* GET - LISTAR TODOS LOS COMPENSATORIOS SIN FILTROS */
router.get("/", CompensatoryController.findAllCompensatories);

/* GET - LISTAR TODOS LOS COMPENSATORIOS DE UN USUARIO EN ESPECIFICO POR SU ID EN UN AÑO ESPECIFICO*/
router.get("/:id", CompensatoryController.findAllCompensatoriesUser);

/* PUT - ACTUALIZAR UN REGISTRO DE COMPENSATORIO DE UN USUARIO */
router.put("/:id", CompensatoryController.updateCompensatory);

/* DELETE - ELIMINAR UN REGISTRO DE COMPENSATORIO POR ID */
router.delete("/:id", CompensatoryController.deleteCompensatory);

export default router;