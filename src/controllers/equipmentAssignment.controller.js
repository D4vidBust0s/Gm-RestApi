/*
  Consulta y liberación manual de reservas de equipos.
  La creación de reservas la hacen los flujos de Programmer y Requirements.
*/

import Equipment from "../models/Equipment";
import EquipmentAssignment from "../models/EquipmentAssignment";
import { broadcast } from "../realtime";
import { agregarEvento } from "../utils/equipmentHistory";

const texto = (valor) => String(valor ?? "").trim();

const usuarioSesion = (req) =>
  req.usuario ?? {
    id: texto(req.headers["x-user-id"]),
    nombre: texto(req.headers["x-user-name"]) || "Administrador",
    rol: texto(req.headers["x-user-role"]),
  };

export const findAssignments = async (req, res) => {
  const origenTipo = texto(req.query.origenTipo);
  const origenId = texto(req.query.origenId);

  try {
    const filtro = {};
    if (origenTipo) filtro.origenTipo = origenTipo;
    if (origenId) filtro.origenId = origenId;
    if (req.query.estado) filtro.estado = texto(req.query.estado);

    const reservas = await EquipmentAssignment.find(filtro)
      .sort({ inicio: -1 })
      .lean();

    res.json(reservas);
  } catch (error) {
    res.status(500).json({
      message: error?.message || "No se pudieron consultar las reservas",
    });
  }
};

export const releaseAssignment = async (req, res) => {
  const usuario = usuarioSesion(req);

  try {
    const reserva = await EquipmentAssignment.findById(req.params.id);
    if (!reserva) {
      return res.status(404).json({ message: "La reserva no existe" });
    }

    if (reserva.estado !== "Activa") {
      return res.status(409).json({
        message: "La reserva ya fue liberada o cancelada",
      });
    }

    reserva.estado = "Liberada";
    reserva.liberadoPor = usuario.nombre;
    reserva.liberadoPorId = usuario.id;
    reserva.liberadoEn = new Date();
    reserva.motivoLiberacion =
      texto(req.body?.motivo) || "Liberación manual desde el inventario";
    await reserva.save();

    const equipo = await Equipment.findById(reserva.equipoId);
    if (equipo) {
      agregarEvento(equipo, {
        tipo: "liberacion",
        titulo: "Reserva liberada manualmente",
        detalle: reserva.motivoLiberacion,
        estadoAnterior: "Asignado",
        estadoNuevo: "Disponible",
        por: usuario.nombre,
        porId: usuario.id,
        meta: {
          origenTipo: reserva.origenTipo,
          origenId: String(reserva.origenId),
          origenCodigo: reserva.origenCodigo,
        },
      });
      equipo.actualizadoPor = usuario.nombre;
      equipo.actualizadoPorId = usuario.id;
      await equipo.save();
    }

    broadcast("equipment:changed", {
      action: "assignment-released",
      id: String(reserva._id),
      equipoId: String(reserva.equipoId),
    });
    broadcast("equipment-assignment:changed", {
      action: "released",
      id: String(reserva._id),
      origenTipo: reserva.origenTipo,
      origenId: String(reserva.origenId),
    });

    res.json(reserva);
  } catch (error) {
    res.status(500).json({
      message: error?.message || "No se pudo liberar la reserva",
    });
  }
};
