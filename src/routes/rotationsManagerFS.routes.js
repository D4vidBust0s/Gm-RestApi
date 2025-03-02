/*
  Archivo que tendra las rutas de la RestApi para rotationsManager
*/

import { Router } from "express";
import * as rotationmanagerFSController from "../controllers/rotationsManagerFS.controller";
const router = Router();

/* POST - CREAR REGISTRO ROUTERCONTROLLER */
router.post("/", rotationmanagerFSController.createRotationsManager);

/* POST - LISTAR TODOS LOS REGISTROS*/
router.get("/", rotationmanagerFSController.findAllReg);

/* PUT - ACTUALIZAR DATOS DESDE PAYROLL*/
router.put("/payroll/:id",rotationmanagerFSController.updatePos);

/*  DELETE - ELIMINAR UN GRUPO POR ID*/
router.delete("/", rotationmanagerFSController.deleteAll);

/*  DELETE - ELIMINAR SOLO UN USERBALANCER USANDO EL ID DE GRUPO*/
router.delete("/:id", rotationmanagerFSController.deleteUserBalancer);

/*  DELETE - ELIMINAR UN REGISTRO DE USUARIO POR ID DE USUARIO*/
router.delete("/delsimplereg/:id", rotationmanagerFSController.deleteUserBalancerById);

/* PUT - ACTUALIZAR EL NOMBRE DEL ESQUEMA YA QUE CAMBIA EN ROTATIONS */
router.put("/setname",rotationmanagerFSController.updateName);

/* PUT - ACTUALIZAR DIA CLAVE EN UN GRUPO */
router.put("/:idG",rotationmanagerFSController.updateDayKey);

/* PUT - ACTUALIZAR DATOS TOTALES EN UN GRUPO */
router.put("/update/:idUs",rotationmanagerFSController.updateSingleData);

/* PUT - ACTUALIZAR FIJO */
router.put("/actfijo/:idUs",rotationmanagerFSController.updateTurnoFijo);

/* PUT - ACTUALIZAR SEGUN schemaid DESPUES DE BORRAR UN ESQUEMA */
router.put("/actualizarpostdel/:id",rotationmanagerFSController.updatePostDel);

/* PUT - ACTUALIZAR EL TOTAL GRUPO DESPUES DE BORRAR UN ESQUEMA */
router.put("/actualizartotalschema/:id",rotationmanagerFSController.updateTotalSchema);



export default router;
