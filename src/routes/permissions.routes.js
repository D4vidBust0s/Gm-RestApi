/*
  Archivo que tendra las rutas de la RestApi para los permisos de un trabajador
*/

import { Router } from "express";
import * as permissionsController from "../controllers/permissions.controller";
import Permission from "../models/Permissions";
const router = Router();

/* POST - CREAR UN PERMISO */
router.post("/", permissionsController.createPermission);

/* POST - LISTAR TODOS LOS PERMISOS DE UN USUARIO EN ESPECIFICO POR SU ID EN UN AÑO ESPECIFICO*/
router.get("/:id", permissionsController.findAllPermissionsUser);

/* PUT - ACTUALIZAR UN REGISTRO DE PERMISO DE UN USUARIO */
router.put("/:id",permissionsController.updatePermiso);

/*  DELETE - ELIMINAR UN GRUPO POR ID*/
router.delete("/:id",permissionsController.deletePermission);

//----------------------------------------------------------------------------------------
//CONSULTAS ESPECIALES
//----------------------------------------------------------------------------------------



export default router;