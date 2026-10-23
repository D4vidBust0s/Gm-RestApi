/*
  Archivo con la lógica y ejecución de procesos que interactúan con
  la base de datos con respecto a las Novedades
*/

import Novelty from "../models/Novelty";

// Crear una nueva novedad
export const createNovelty = async (req, res) => {
  const { grupoID, colaboradorNombre, cargo, tipo, descripcion, administradorReporto, fechaHoraReporte, esGeneralGrupo } = req.body;

  if (!grupoID || !tipo || !descripcion || !administradorReporto) {
    return res.status(400).send({
      message: "No se han enviado los parámetros obligatorios para registrar la novedad.",
    });
  }

  try {
    const newNovelty = new Novelty({
      grupoID,
      esGeneralGrupo: esGeneralGrupo || false,
      colaboradorNombre: colaboradorNombre || "General del Grupo",
      cargo: cargo || "Área / Equipos",
      tipo,
      descripcion,
      administradorReporto,
      fechaHoraReporte: fechaHoraReporte || new Date().toLocaleString(),
      estado: "Pendiente"
    });

    const savedNovelty = await newNovelty.save();
    res.status(201).json(savedNovelty);
  } catch (error) {
    res.status(500).json({
      message: error.message || "Error intentando crear la novedad",
    });
  }
};

// Listar todas las novedades (Permite filtrar opcionalmente por ?grupoID=xxx)
export const findAllNovelties = async (req, res) => {
  try {
    const { grupoID } = req.query;
    const filter = grupoID ? { grupoID } : {};
    
    const novelties = await Novelty.find(filter).sort({ createdAt: -1 });
    res.json(novelties);
  } catch (error) {
    res.status(500).json({
      message: "Error intentando listar las novedades",
    });
  }
};

// Encontrar una novedad por ID
export const findOneNovelty = async (req, res) => {
  const { id } = req.params;

  try {
    const novelty = await Novelty.findById(id);

    if (!novelty)
      return res.status(404).json({
        message: `La novedad con id ${id} no existe`,
      });
      
    res.json(novelty);
  } catch (error) {
    res.status(500).json({
      message: `Error trayendo la información de la novedad con id ${id}`,
    });
  }
};

// Dar solución a una novedad (Actualiza estado y datos de resolución)
export const resolveNovelty = async (req, res) => {
  const { id } = req.params;
  const { solucion } = req.body;

  if (!solucion || !solucion.texto || !solucion.administradorSolucion) {
    return res.status(400).json({
      message: "Faltan datos de la solución (texto o administrador)",
    });
  }

  try {
    const updatedNovelty = await Novelty.findByIdAndUpdate(
      id,
      {
        estado: "Solucionado",
        solucion: {
          texto: solucion.texto,
          administradorSolucion: solucion.administradorSolucion,
          fechaHoraSolucion: solucion.fechaHoraSolucion || new Date().toLocaleString()
        }
      },
      { new: true }
    );

    if (!updatedNovelty) {
      return res.status(404).json({ message: `Novedad con id ${id} no encontrada` });
    }

    res.json({ message: "Novedad solucionada exitosamente", updatedNovelty });
  } catch (error) {
    res.status(500).json({
      message: `Error intentando resolver la novedad con id ${id}`,
    });
  }
};


// Eliminar una novedad por ID
export const deleteNovelty = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedNovelty = await Novelty.findByIdAndDelete(id);
    
    if (!deletedNovelty) {
      return res.status(404).json({ message: `Novedad con id ${id} no encontrada` });
    }

    res.json({ message: "Novedad eliminada correctamente", id });
  } catch (error) {
    res.status(500).json({
      message: `Error eliminando la novedad con id ${id}`,
    });
  }
};