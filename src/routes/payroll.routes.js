/*
  Archivo que tendra las rutas de la RestApi para el payroll o nomina
*/

import { Router } from "express";
import * as payrollController from "../controllers/payroll.controllers";
import Groups from "../models/Payroll";
const router = Router();

/* POST - CREAR GRUPO */
router.post("/", payrollController.createPayroll);

/* POST - LISTAR TODOS LOS GRUPOS*/
router.get("/", payrollController.findAllPayroll);

/* GET - ENCONTRAR UN GRUPO POR ID*/
router.get("/:id", payrollController.findOnePerson);

/* GET - LISTAR LOS NOMBRES DE LAS PERSONAS POR NOMBRE DEL GRUPO QUE PERTENECE*/
router.get("/people/:group", payrollController.findOnePersonByGroup);

/*  DELETE - ELIMINAR UN GRUPO POR ID*/
router.delete("/:id",payrollController.deletePerson);

/* PUT - ACTUALIZAR UNA PERSONA */
router.put("/:id",payrollController.updatePerson);

//----------------------------------------------------------------------------------------
//CONSULTAS ESPECIALES
//----------------------------------------------------------------------------------------

/* GET - ENCONTRAR LAS PERSONAS QUE ESTAN VINCULADAS AL GRUPO POR NOMBRE DEL GRUPO*/
router.get("/show/:nameGroup",payrollController.showPersonsByGroup);





export default router;
