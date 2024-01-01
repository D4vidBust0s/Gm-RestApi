/*
  Archivo con la logica y ejecución de todos los procesos que interactuan con
  la base de datos con respecto a las tareas
*/




import Task from "../models/Task";

//Crear una nueva tarea
export const createTask = async (req, res) => {
  if (!req.body.title || !req.body.description) {
    return res
      .status(400)
      .send({ message: "El contenido no puede estar vacio" });
  }

  try {
    const newTask = new Task({
      title: req.body.title,
      description: req.body.description,
      done: req.body.done ? req.body.done : false,
    });

    const taskSaved = await newTask.save();
    res.json(taskSaved);
  } catch (error) {
    res.status(500).json({
      message: error.message || "error intentando crear la tarea",
    });
  }
};

// Obtener todas las tareas
export const findAllTasks = async (req, res) => {
  try {
    const Tasks = await Task.find();
    res.json(Tasks);
  } catch (error) {
    res.status(500).json({
      message: error.message || "error intentando listar las tareas",
    });
  }
};

//Obtener unicamente las tareas completadas
export const findAllDoneTask = async (req, res) => {
  const Tasks = await Task.find({ done: true });
  res.json(Tasks);
};

//Obtener una sola tarea por id
export const findOneTask = async (req, res) => {
  const { id } = req.params;

  try {
    const onetask = await Task.findById(id);

    if (!onetask)
      return res.status(404).json({
        message: `La tarea con id ${id} no existe`,
      });
    res.json(onetask);
  } catch (error) {
    res.status(500).json({
      message:
        error.message ||
        `Error trayendo la informacion de la tarea con id ${id}`,
    });
  }
};

//Eliminar una tarea por id
export const deleteTask = async (req, res) => {
  const { id } = req.params;

  try {
    const data = await Task.findByIdAndDelete(id);
    res.json({
      message: `Tarea con el nombre ${data.title} .Eliminada correctamente`,
    });
  } catch (error) {
    res.json({
      message: `error eliminando la tarea con id ${id}`,
    });
  }
  
};

//Actualizar uan tarea
export const updateTask = async (req, res) => {
  await Task.findByIdAndUpdate(req.params.id, req.body);
  res.json({ message: "Tarea actualizada" });
};
