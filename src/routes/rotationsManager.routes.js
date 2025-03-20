/*
  Archivo que tendra las rutas de la RestApi para rotationsManager
*/

import { Router } from "express";
import * as rotationmanagerController from "../controllers/rotationsManager.controller";
const router = Router();

/* POST - CREAR REGISTRO ROUTERCONTROLLER */
router.post("/", rotationmanagerController.createRotationsManager);

/* POST - LISTAR TODOS LOS REGISTROS*/
router.get("/", rotationmanagerController.findAllReg);

/* GET - OBTENER TODOS LOS REGISTROS DE UN GRUPO CUYOS TRABAJADORES TIENEN TURNO FIJO*/
router.get("/fijos/:idgroup", rotationmanagerController.findAllRegFijos);

/* PUT - ACTUALIZAR DATOS DESDE PAYROLL*/
router.put("/payroll/:id",rotationmanagerController.updatePos);

/*  DELETE - ELIMINAR UN GRUPO POR ID*/
router.delete("/", rotationmanagerController.deleteAll);

/*  DELETE - ELIMINAR SOLO UN USERBALANCER USANDO EL ID DE GRUPO*/
router.delete("/:id", rotationmanagerController.deleteUserBalancer);

/*  DELETE - ELIMINAR UN REGISTRO DE USUARIO POR ID DE USUARIO*/
router.delete("/delsimplereg/:id", rotationmanagerController.deleteUserBalancerById);

/* PUT - ACTUALIZAR EL NOMBRE DEL ESQUEMA YA QUE CAMBIA EN ROTATIONS */
router.put("/setname",rotationmanagerController.updateName);

/* PUT - ACTUALIZAR DIA CLAVE EN UN GRUPO */
router.put("/:idG",rotationmanagerController.updateDayKey);

/* PUT - ACTUALIZAR DATOS TOTALES EN UN GRUPO */
router.put("/update/:idUs",rotationmanagerController.updateSingleData);

/* PUT - ACTUALIZAR FIJO */
router.put("/actfijo/:idUs",rotationmanagerController.updateTurnoFijo);

/* PUT - ACTUALIZAR SEGUN schemaid DESPUES DE BORRAR UN ESQUEMA */
router.put("/actualizarpostdel/:id",rotationmanagerController.updatePostDel);

/* PUT - ACTUALIZAR EL TOTAL GRUPO DESPUES DE BORRAR UN ESQUEMA */
router.put("/actualizartotalschema/:id",rotationmanagerController.updateTotalSchema);

/* PUT - ACTUALIZAR EL TOTALGROUP DESPUES DE ELIMINAR UN USUARIO */
router.put("/uptdatetotalgroup/:id",rotationmanagerController.updateTotalGroup);



export default router;
