import Task from "../models/Task.js";

const HORA_RECORDATORIO = /^([01]\d|2[0-3]):[0-5]\d$/;

/* Limites de adjuntos: mismo patron que el chat (data URL dentro del documento).
   Se acotan para mantener el documento muy por debajo del limite de Mongo. */
const MAX_ADJUNTOS = 3;
const MAX_BYTES_ADJUNTO = 4 * 1024 * 1024;
// base64 ocupa ~1.37 veces el tamano original; se deja margen.
const MAX_LARGO_DATA_URL = Math.ceil(MAX_BYTES_ADJUNTO * 1.4);

/** Valida y limpia los adjuntos recibidos. Devuelve { adjuntos, error }. */
const normalizarAdjuntos = (lista) => {
  if (lista === undefined) return { adjuntos: undefined, error: null };
  if (!Array.isArray(lista)) return { adjuntos: [], error: null };

  const limpios = [];

  for (const item of lista) {
    if (!item || typeof item !== "object") continue;

    const url = typeof item.url === "string" ? item.url.trim() : "";
    if (!url.startsWith("data:")) continue;

    if (url.length > MAX_LARGO_DATA_URL) {
      return { adjuntos: [], error: "Cada adjunto debe pesar menos de 4 MB" };
    }

    limpios.push({
      nombre: String(item.nombre ?? "archivo").slice(0, 200),
      tipo: String(item.tipo ?? "").slice(0, 120),
      url,
      tamano: Number(item.tamano) > 0 ? Number(item.tamano) : 0
    });
  }

  if (limpios.length > MAX_ADJUNTOS) {
    return { adjuntos: [], error: `Máximo ${MAX_ADJUNTOS} adjuntos por nota` };
  }

  return { adjuntos: limpios, error: null };
};

// Acepta true, "true", 1 y "1" para no interpretar "false" como verdadero.
const aBooleano = (valor) =>
  valor === true || valor === "true" || valor === 1 || valor === "1";

// Dias del recordatorio: enteros 0..6, sin duplicados y ordenados.
const normalizarDiasRecordatorio = (dias) => {
  if (!Array.isArray(dias)) return [];

  const unicos = new Set(
    dias
      .filter((dia) => dia !== null && dia !== undefined && dia !== "")
      .map((dia) => Number(dia))
      .filter((dia) => Number.isInteger(dia) && dia >= 0 && dia <= 6)
  );

  return [...unicos].sort((a, b) => a - b);
};

// Horas del recordatorio: "HH:mm", sin duplicados y ordenadas.
const normalizarHorasRecordatorio = (horas) => {
  if (!Array.isArray(horas)) return [];

  const unicas = new Set(
    horas
      .map((hora) => String(hora ?? "").trim())
      .filter((hora) => HORA_RECORDATORIO.test(hora))
  );

  return [...unicas].sort();
};

/**
 * Valida la configuracion del recordatorio. Devuelve el mensaje de error o
 * null cuando es valida. Tambien detecta valores descartados al normalizar.
 */
const validarRecordatorio = ({
  activo,
  fechaVencimiento,
  dias,
  horas,
  diasOriginales,
  horasOriginales,
}) => {
  if (!activo) return null;

  if (!fechaVencimiento) {
    return "La fecha límite es obligatoria cuando la tarea es un recordatorio";
  }

  if (dias.length === 0) {
    return "Selecciona al menos un día para el recordatorio";
  }

  if (horas.length === 0) {
    return "Selecciona al menos una hora para el recordatorio";
  }

  const diasUnicos = new Set(
    (Array.isArray(diasOriginales) ? diasOriginales : []).map((dia) =>
      Number(dia)
    )
  );

  if (diasUnicos.size !== dias.length) {
    return "Los días del recordatorio deben estar entre 0 y 6";
  }

  const horasUnicas = new Set(
    (Array.isArray(horasOriginales) ? horasOriginales : []).map((hora) =>
      String(hora ?? "").trim()
    )
  );

  if (horasUnicas.size !== horas.length) {
    return "Las horas del recordatorio deben tener formato HH:mm";
  }

  return null;
};

// Obtener todas las tareas exclusivas de un usuario específico
export const getTasksByUser = async (req, res) => {
  const { userId } = req.params;
  try {
    const tasks = await Task.find({ userId }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message || "Error al obtener las tareas" });
  }
};

// Crear una nueva tarea asignada al usuario
export const createTask = async (req, res) => {
  const { userId, titulo, descripcion, prioridad, categoria, fechaVencimiento } = req.body;

  try {
    if (!userId || !titulo) {
      return res.status(400).json({ message: "El userId y el título son obligatorios" });
    }

    const esRecordatorio = aBooleano(req.body.esRecordatorio);
    const dias = normalizarDiasRecordatorio(req.body.recordatorioDias);
    const horas = normalizarHorasRecordatorio(req.body.recordatorioHoras);

    const errorRecordatorio = validarRecordatorio({
      activo: esRecordatorio,
      fechaVencimiento,
      dias,
      horas,
      diasOriginales: req.body.recordatorioDias,
      horasOriginales: req.body.recordatorioHoras,
    });

    if (errorRecordatorio) {
      return res.status(400).json({ message: errorRecordatorio });
    }

    const { adjuntos, error: errorAdjuntos } = normalizarAdjuntos(req.body.adjuntos);
    if (errorAdjuntos) {
      return res.status(400).json({ message: errorAdjuntos });
    }

    const newTask = new Task({
      userId,
      titulo,
      descripcion,
      prioridad: prioridad || "Media",
      categoria: categoria || "General",
      fechaVencimiento: fechaVencimiento || null,
      esRecordatorio,
      recordatorioDias: esRecordatorio ? dias : [],
      recordatorioHoras: esRecordatorio ? horas : [],
      adjuntos: adjuntos || [],
    });

    const savedTask = await newTask.save();
    res.status(201).json(savedTask);
  } catch (error) {
    res.status(500).json({ message: error.message || "Error al crear la tarea" });
  }
};

// Actualizar el estado o contenido de una tarea
export const updateTask = async (req, res) => {
  const { id } = req.params;

  try {
    const updateData = {};

    // Solo se actualizan los campos enviados: el PUT parcial de "completada"
    // no debe borrar el resto de la tarea ni su recordatorio.
    ["titulo", "descripcion", "prioridad", "categoria", "completada", "fechaVencimiento"].forEach(
      (campo) => {
        if (req.body[campo] !== undefined) {
          updateData[campo] = req.body[campo];
        }
      }
    );

    if (req.body.esRecordatorio !== undefined) {      const esRecordatorio = aBooleano(req.body.esRecordatorio);
      const dias = normalizarDiasRecordatorio(req.body.recordatorioDias);
      const horas = normalizarHorasRecordatorio(req.body.recordatorioHoras);

      let fechaParaValidar = req.body.fechaVencimiento;

      // Si solo se envían los campos del recordatorio, se usa la fecha ya
      // guardada para validar la coherencia con la tarea.
      if (esRecordatorio && fechaParaValidar === undefined) {
        const tareaActual = await Task.findById(id).select("fechaVencimiento");

        if (!tareaActual) {
          return res.status(404).json({ message: "Tarea no encontrada" });
        }

        fechaParaValidar = tareaActual.fechaVencimiento;
      }

      const errorRecordatorio = validarRecordatorio({
        activo: esRecordatorio,
        fechaVencimiento: fechaParaValidar,
        dias,
        horas,
        diasOriginales: req.body.recordatorioDias,
        horasOriginales: req.body.recordatorioHoras,
      });

      if (errorRecordatorio) {
        return res.status(400).json({ message: errorRecordatorio });
      }

      updateData.esRecordatorio = esRecordatorio;
      updateData.recordatorioDias = esRecordatorio ? dias : [];
      updateData.recordatorioHoras = esRecordatorio ? horas : [];
    }

    // Los adjuntos solo se reemplazan cuando el cliente los envía: el PUT
    // parcial de "completada" no debe borrarlos.
    const { adjuntos, error: errorAdjuntos } = normalizarAdjuntos(req.body.adjuntos);
    if (errorAdjuntos) {
      return res.status(400).json({ message: errorAdjuntos });
    }

    if (adjuntos !== undefined) {
      updateData.adjuntos = adjuntos;
    }

    const updatedTask = await Task.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!updatedTask) {
      return res.status(404).json({ message: "Tarea no encontrada" });
    }

    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ message: error.message || "Error al actualizar la tarea" });
  }
};

// Eliminar una tarea
export const deleteTask = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedTask = await Task.findByIdAndDelete(id);
    if (!deletedTask) {
      return res.status(404).json({ message: "Tarea no encontrada" });
    }

    res.json({ message: "Tarea eliminada exitosamente" });
  } catch (error) {
    res.status(500).json({ message: error.message || "Error al eliminar la tarea" });
  }
};
