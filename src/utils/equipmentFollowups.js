/*
  Consultas de seguimientos de mantenimiento pendientes.
  El dashboard de GM-Activos los consumirá más adelante; Maintenance los usa
  para que un seguimiento no quede sin responsable.
*/

import Equipment from "../models/Equipment";
import { calcularProgreso, mapearSeguimiento } from "./equipmentMaintenance";
import { serializarEquipo } from "./equipmentSerializer";

/**
 * Devuelve una fila por cada mantenimiento con seguimiento pendiente.
 */
export const listarSeguimientosPendientes = async () => {
  const equipos = await Equipment.find({
    "mantenimientos.seguimiento.estado": "Pendiente",
  })
    .populate("categoriaId", "nombre descripcion imagen imagenMiniatura")
    .populate("subcategoriaId", "nombre descripcion imagen imagenMiniatura")
    .populate("ubicacionId", "nombre")
    .sort({ "mantenimientos.seguimiento.inicio": 1 })
    .lean();

  const seguimientos = [];

  equipos.forEach((equipo) => {
    const base = serializarEquipo(equipo, {
      incluirMantenimientos: false,
      incluirHistorial: false,
    });

    (equipo.mantenimientos ?? []).forEach((mantenimiento) => {
      const seguimiento = mantenimiento.seguimiento;

      if (!seguimiento || seguimiento.estado !== "Pendiente") return;

      seguimientos.push({
        equipoId: base.id,
        mantenimientoId: String(mantenimiento._id ?? ""),
        placa: base.placa,
        descripcion: base.descripcion,
        categoria: base.categoria,
        subcategoria: base.subcategoria,
        ubicacion: base.ubicacion,
        imagen: base.imagen,
        tecnico: String(mantenimiento.tecnico ?? "").trim(),
        tipo: String(mantenimiento.tipo ?? "").trim(),
        mantenimientoDescripcion: String(
          mantenimiento.descripcion ?? ""
        ).trim(),
        inicio: seguimiento.inicio ?? null,
        seguimiento: mapearSeguimiento(mantenimiento),
        progreso: calcularProgreso({
          estado: String(mantenimiento.estado ?? "").trim(),
          pasos: Array.isArray(mantenimiento.pasos) ? mantenimiento.pasos : [],
        }),
        iniciadoPor: String(mantenimiento.por ?? "").trim(),
        finalizadoPor: String(mantenimiento.finalizadoPor ?? "").trim(),
        estadoEquipo: base.subEstado,
      });
    });
  });

  seguimientos.sort((a, b) => {
    const fechaA = a.inicio ? new Date(a.inicio).getTime() : 0;
    const fechaB = b.inicio ? new Date(b.inicio).getTime() : 0;
    return fechaA - fechaB;
  });

  return {
    total: seguimientos.length,
    seguimientos,
  };
};
