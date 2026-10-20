import Task from "../models/Task.js";

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

    const newTask = new Task({
      userId,
      titulo,
      descripcion,
      prioridad: prioridad || "Media",
      categoria: categoria || "General",
      fechaVencimiento: fechaVencimiento || null
    });

    const savedTask = await newTask.save();
    res.status(201).json(savedTask);
  } catch (error) {
    res.status(500).json({ message: error.message || "Error al crear la tarea" });
  }
};

// Actualizar el estado o contenido de una tarea (validando que pertenezca al usuario si es necesario, o directamente por ID)
export const updateTask = async (req, res) => {
  const { id } = req.params;
  const { titulo, descripcion, prioridad, categoria, completada, fechaVencimiento } = req.body;

  try {
    const updatedTask = await Task.findByIdAndUpdate(
      id,
      { titulo, descripcion, prioridad, categoria, completada, fechaVencimiento },
      { new: true }
    );

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