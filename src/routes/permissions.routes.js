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

/* GET - ENCONTRAR UN GRUPO POR ID*/
//router.get("/:id", payrollController.findOnePerson);

/* GET - LISTAR LOS NOMBRES DE LAS PERSONAS POR NOMBRE DEL GRUPO QUE PERTENECE*/
//router.get("/people/:group", payrollController.findOnePersonByGroup);

/*  DELETE - ELIMINAR UN GRUPO POR ID*/
//router.delete("/:id",payrollController.deletePerson);

/* PUT - ACTUALIZAR UNA PERSONA */
//router.put("/:id",payrollController.updatePerson);

//----------------------------------------------------------------------------------------
//CONSULTAS ESPECIALES
//----------------------------------------------------------------------------------------

/* GET - ENCONTRAR LAS PERSONAS QUE ESTAN VINCULADAS AL GRUPO POR ID DE GRUPO*/
//router.get("/show/:nameGroup",payrollController.showPersonsByGroup);

export default router;