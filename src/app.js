/*  
   CREACION DEL SERVIDOR DE EXPRESS 
   Y SU RESPECTIVA CONFIGURACION USANDO BABEL
   PARA COMPILAR CON JAVASCRIPT RECIENTE O MODERNO
   ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------
*/

import express from "express";
import config from "./config";
import morgan from "morgan";
import cors from "cors";

//Routes
import TaskRoutes from "./routes/task.routes";
import GroupRoutes from './routes/group.routes';
import ProgramRoutes from './routes/program.routes';
import PayrollRoutes from './routes/payroll.routes';
import RulesRoutes from './routes/rules.routes';
import Holidays from './routes/holidays.routes';
import RotationsRoutes from './routes/rotations.routes';
import PermissionsRoutes from './routes/permissions.routes';
import IncapacitysRoutes from './routes/Incapacitys.routes';
import RecessRoutes from './routes/recess.routes';
import LicensesRoutes from './routes/licenses.routes';
import shiftsRoutes from './routes/shifts.routes';
import breaksRoutes from './routes/breaks.routes';
import BalancerRoutes from './routes/balancer.routes';
import RotationsManager from './routes/rotationsManager.routes';


//Settings
const app = express();
app.set("port", config.Port_SERVER || 3000);

//Middlewares
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

//Route raiz default
app.get("/", (req, res) => {
  res.json({ message: "Welcome to API Gestion manager Citytv - Powered By David Bustos" });
});

// Rutas de toda la api
app.use("/api/task", TaskRoutes);
app.use("/api/groups",GroupRoutes);
app.use("/api/programs",ProgramRoutes);
app.use("/api/payroll",PayrollRoutes);
app.use("/api/rules",RulesRoutes);
app.use("/api/holidays",Holidays);
app.use("/api/rotations",RotationsRoutes);
app.use("/api/permissions",PermissionsRoutes);
app.use("/api/incapacitys",IncapacitysRoutes);
app.use("/api/recess",RecessRoutes);
app.use("/api/licenses",LicensesRoutes);
app.use("/api/shifts",shiftsRoutes);
app.use("/api/breaks",breaksRoutes);
app.use("/api/balancer",BalancerRoutes);
app.use("/api/rotationsmanager",RotationsManager);


export default app;
