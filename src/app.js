/*  
   CREACION DEL SERVIDOR DE EXPRESS 
   Y SU RESPECTIVA CONFIGURACION USANDO BABEL
   PARA COMPILAR CON JAVASCRIPT RECIENTE O MODERNO y FUNCIONAL
   ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------
*/

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
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
import RotationsManagerfs from './routes/rotationsManagerFS.routes';
import StacksManager from './routes/stacks.routes';
import StackSavedManager from './routes/stacks-saved.routes';
import Substitutions from './routes/substitutions.routes';
import Notations from './routes/notations.routes';
import Programmer from './routes/programmer.routes';
import DepartmentRoutes from './routes/department.routes';
import SavedStacks from './routes/savedStack.routes';
import cvRoutes from './routes/cv.routes';
import noveltyRoutes from "./routes/novelty.routes";
import AuthRoutes from './routes/auth.routes';
import CompensatoryRoutes from './routes/compensatory.routes';
import Proyections from './routes/projection.routes';
import MessageRoutes from './routes/message.routes';
import EquipmentRoutes from './routes/equipment.routes';
import EquipmentCategoriesRoutes from './routes/equipmentCategories.routes';
import EquipmentSubcategoriesRoutes from './routes/equipmentSubcategories.routes';
import EquipmentLocationsRoutes from './routes/equipmentLocations.routes';
import EquipmentAssignmentsRoutes from './routes/equipmentAssignments.routes';
import RequirementsRoutes from './routes/requirements.routes';
import AssignmentsRoutes from './routes/assignments.routes';
import EquipmentIncidentsRoutes from './routes/equipmentIncidents.routes';

// Realtime (socket compartido para novedades y otros módulos)
import { registerRealtime } from "./realtime";

// Models
import Message from "./models/message";

//Settings
const app = express();
app.set("port", config.Port_SERVER || 4000);

// --- INICIO DE INTEGRACIÓN SOCKET.IO ---
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
registerRealtime(io);
// --- FIN DE INTEGRACIÓN SOCKET.IO ---

//Middlewares
app.use(morgan("dev"));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

//Route raiz default
app.get("/", (req, res) => {
  res.json({ message: "Welcome to API Gestion manager Citytv - Powered By David Bustos" });
});

// Rutas de toda la api
app.use("/api/tasks", TaskRoutes);
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
app.use("/api/rotationsmanager-fs",RotationsManagerfs);
app.use("/api/stacks",StacksManager);
app.use("/api/stacks-saved",StackSavedManager);
app.use("/api/substitutions",Substitutions);
app.use("/api/notations",Notations);
app.use("/api/programmer",Programmer);
app.use("/api/departments", DepartmentRoutes);
app.use("/api/savedstacks",SavedStacks);
app.use('/api/cv', cvRoutes);
app.use("/api/novelties", noveltyRoutes);
app.use("/api/auth", AuthRoutes);
app.use("/api/compensatories", CompensatoryRoutes);
app.use("/api/projections", Proyections);
app.use("/api/messages", MessageRoutes);
app.use("/api/equipment", EquipmentRoutes);
app.use("/api/equipment-categories", EquipmentCategoriesRoutes);
app.use("/api/equipment-subcategories", EquipmentSubcategoriesRoutes);
app.use("/api/equipment-locations", EquipmentLocationsRoutes);
app.use("/api/equipment-assignments", EquipmentAssignmentsRoutes);
app.use("/api/assignments", AssignmentsRoutes);
app.use("/api/equipment-incidents", EquipmentIncidentsRoutes);
app.use("/api/requirements", RequirementsRoutes);


// --- LÓGICA DE SOCKETS (LIMPIEZA BLINDADA DE USUARIOS EN LÍNEA) ---
let usuariosEnLinea = {}; // { userId: socketId }

const emitirUsuariosEnLinea = () => {
  io.emit("actualizar_usuarios_en_linea", usuariosEnLinea);
};

io.on("connection", (socket) => {
  console.log(`Usuario conectado al chat por socket: ${socket.id}`);

  // El estado actual se entrega de inmediato, aunque el cliente aún no emita
  // "usuario_conectado" (por ejemplo tras un reinicio del servidor).
  socket.emit("actualizar_usuarios_en_linea", usuariosEnLinea);

  socket.on("usuario_conectado", (userId) => {
    if (!userId) return;

    socket.data.userId = String(userId);

    // Limpiamos cualquier socket previo asociado al mismo userId para evitar duplicados fantasmas
    for (const [uId, sId] of Object.entries(usuariosEnLinea)) {
      if (uId === String(userId) || sId === socket.id) {
        delete usuariosEnLinea[uId];
      }
    }

    usuariosEnLinea[String(userId)] = socket.id;
    emitirUsuariosEnLinea();
    console.log(`Usuario en línea registrado: ${userId} -> Socket: ${socket.id}`);
  });

  // Permite al cliente pedir el mapa actual sin volver a registrarse.
  socket.on("solicitar_usuarios_en_linea", () => {
    socket.emit("actualizar_usuarios_en_linea", usuariosEnLinea);
  });

  socket.on("usuario_desconectado", (userId) => {
    if (!userId) return;

    const id = String(userId);
    if (usuariosEnLinea[id] === socket.id) {
      delete usuariosEnLinea[id];
      emitirUsuariosEnLinea();
      console.log(`Usuario desconectado manualmente: ${id}`);
    }
  });

  // Evento cuando un usuario está escribiendo en un chat privado
  socket.on("escribiendo", (datos) => {
    try {
      if (datos && datos.destinatarioId) {
        const socketDestinatarioId = usuariosEnLinea[datos.destinatarioId];
        if (socketDestinatarioId) {
          io.to(socketDestinatarioId).emit("usuario_escribiendo", { 
            remitenteId: datos.remitenteId 
          });
        }
      }
    } catch (error) {
      console.error("Error en evento escribiendo:", error);
    }
  });

 socket.on("enviar_mensaje", async (datos) => {
    try {
      // 1. Guardar en la base de datos
      const nuevoMensaje = new Message({
        remitente: datos.remitente,
        destinatario: datos.destinatarioId === 'gen' ? null : datos.destinatarioId,
        texto: datos.texto,
        archivoUrl: datos.archivoUrl || ""
      });
      await nuevoMensaje.save();

      const mensajePopulated = await Message.findById(nuevoMensaje._id).populate('remitente', 'nombres apellidos rol imagen');

      if (!datos.destinatarioId || datos.destinatarioId === 'gen') {
        // Mensaje para el Chat General
        io.emit("recibir_mensaje", mensajePopulated);
      } else {
        // Mensaje Privado
        const socketRemitenteId = usuariosEnLinea[datos.remitente];
        const socketDestinatarioId = usuariosEnLinea[datos.destinatarioId];

        // Enviar al destinatario si está conectado
        if (socketDestinatarioId) {
          io.to(socketDestinatarioId).emit("recibir_mensaje", mensajePopulated);
        }

        // Enviar de regreso al remitente para que se refleje en su pantalla
        if (socketRemitenteId && socketRemitenteId !== socketDestinatarioId) {
          io.to(socketRemitenteId).emit("recibir_mensaje", mensajePopulated);
        }
      }
    } catch (error) {
      console.error("Error al procesar el mensaje:", error);
    }
  });


  socket.on("disconnect", () => {
    const usuarioDesconectadoId = socket.data.userId;

    if (usuarioDesconectadoId && usuariosEnLinea[usuarioDesconectadoId] === socket.id) {
      delete usuariosEnLinea[usuarioDesconectadoId];
      emitirUsuariosEnLinea();
      console.log(`Socket desconectado automáticamente y purgado: ${usuarioDesconectadoId}`);
    }
  });
});

export { httpServer, io };
export default app;
