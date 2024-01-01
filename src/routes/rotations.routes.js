/*
  Archivo que tendra las rutas de la RestApi para la gestion de las rotaciones
*/

import { Router } from "express";
import * as rotationsController from "../controllers/rotations.controller";
import Rotations from "../models/Rotations";
const router = Router();

/* POST - CREAR REGISTRO ENTRE SEMANA */
router.post("/", rotationsController.createEntreSemana);

/* GET - ENCONTRAR UN REGISTRO POR ID ENTRE SEMANA*/
router.get("/:ID", rotationsController.findAllRegGroupsById);

/* GET - ENCONTRAR UN REGISTRO POR ID ENTRE SEMANA*/
router.get("/fs/:ID", rotationsController.findAllRegGroupsByIdFs);

/* GET - TRAER EL AÑO DE UN REGISTRO USANDO EL ID*/
router.get("/item/:id", rotationsController.findHorainicioItemById);

/* PUT - ACTUALIZAR UN REGISTRO DEL ESQUEMA USANDO EL ID DEL REGISTRO */
router.put("/", rotationsController.actualizarSchema);

/* DELETE - ELIMINAR UN REGISTRO USANDO EL ID CORRESPONDIENTE */
router.put("/delete/", rotationsController.delReg);


/* POST - LISTAR TODOS LOS GRUPOS*/
//router.get("/", groupController.findAllGroups);

/* GET - ENCONTRAR UN REGISTRO POR AÑO*/
//router.get("/:year", holidayController.findOneHoliday);

/* GET - ENCONTRAR UN REGISTRO POR MES*/
//router.get("/mes/:mes", holidayController.findOneRegMes);

/* GET - ENCONTRAR UN REGISTRO POR DIA*/
//router.get("/dia/:dias", holidayController.findOneRegDia);

/* DELETE - ELIMINAR UN REGISTRO HOLIDAY*/
//router.put("/delregistro/", holidayController.deleteReg);

/* PUT - ACTUALIZAR EL MOTIVO TENIENDO DIA MES AÑO  */
//router.put("/",holidayController.updateMotivo);

/* PUT - REALIZA EL PROCESO DE CLONACION DE UN AÑO A OTRO */
//router.put("/clone/",holidayController.clonar);

/* PUT - ACTUALIZAR UN DIA EN EL MES */
//router.put("/:dias",holidayController.updateReg);



export default router;
