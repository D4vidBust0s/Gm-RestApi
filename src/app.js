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
  res.json({ message: "Welcome to API Gestion manager Citytv" });
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




export default app;
