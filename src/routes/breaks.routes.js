/*
  Archivo que tendra las rutas de la RestApi para los descansos de un trabajador
*/

import { Router } from "express";
import * as permissionsController from "../controllers/breaks.controller";
import Permission from "../models/Permissions";
const router = Router();

/* POST - CREAR DESCANSO */
router.post("/", permissionsController.createPermission);

/* POST - LISTAR TODOS LOS DESCANSOS SIN CONDICIONES*/
router.get("/", permissionsController.findAllPermissions);

/* POST - LISTAR TODOS LOS DESCANSOS DE UN USUARIO EN ESPECIFICO POR SU ID EN UN AÑO ESPECIFICO*/
router.get("/:id", permissionsController.findAllPermissionsUser);

/* PUT - ACTUALIZAR UN REGISTRO DE DESCANSO DE UN USUARIO */
router.put("/:id",permissionsController.updatePermiso);

/*  DELETE - ELIMINAR UN DESCANSO POR ID*/
router.delete("/:id",permissionsController.deletePermission);

//----------------------------------------------------------------------------------------
//CONSULTAS ESPECIALES
//----------------------------------------------------------------------------------------



export default router;