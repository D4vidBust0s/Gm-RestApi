/*
  Archivo que tendra las rutas de la RestApi para los dias festivos
*/

import { Router } from "express";
import * as holidayController from "../controllers/holiday.controller";
import Holidays from "../models/Holidays";
const router = Router();

/* POST - CREAR REGISTRO HOLIDAY */
router.post("/", holidayController.createHoliday);

/* POST - LISTAR TODOS LOS GRUPOS*/
//router.get("/", groupController.findAllGroups);

/* GET - ENCONTRAR UN REGISTRO POR AÑO*/
router.get("/:year", holidayController.findOneHoliday);

/* GET - ENCONTRAR UN REGISTRO POR MES*/
router.get("/mes/:mes", holidayController.findOneRegMes);

/* GET - ENCONTRAR UN REGISTRO POR DIA*/
router.get("/dia/:dias", holidayController.findOneRegDia);

/* DELETE - ELIMINAR UN REGISTRO HOLIDAY*/
router.put("/delregistro/", holidayController.deleteReg);

/* PUT - ACTUALIZAR EL MOTIVO TENIENDO DIA MES AÑO  */
router.put("/",holidayController.updateMotivo);

/* PUT - REALIZA EL PROCESO DE CLONACION DE UN AÑO A OTRO */
router.put("/clone/",holidayController.clonar);

/* PUT - ACTUALIZAR UN DIA EN EL MES */
router.put("/:dias",holidayController.updateReg);



export default router;
