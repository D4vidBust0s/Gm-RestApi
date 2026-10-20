const Projection = require('../models/projection');

// Guardar o actualizar un valor de proyección individual (ideal para el onChange)
exports.guardarProyeccion = async (req, res) => {
  try {
    const { userId, fechaClave, valorProyeccion, grupoId } = req.body;

    if (!userId || !fechaClave) {
      return res.status(400).json({ error: 'Faltan datos obligatorios (userId, fechaClave)' });
    }

    const valorNumerico = valorProyeccion === "" ? 0 : parseFloat(valorProyeccion);

    const proyeccionActualizada = await Projection.findOneAndUpdate(
      { userId, fechaClave },
      { valorProyeccion: valorNumerico, grupoId },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({
      success: true,
      message: 'Proyección guardada correctamente',
      data: proyeccionActualizada
    });
  } catch (error) {
    console.error('Error al guardar proyección:', error);
    res.status(500).json({ error: 'Error interno del servidor al guardar la proyección' });
  }
};

// Obtener todas las proyecciones (para cargarlas al iniciar el componente)
exports.obtenerProyecciones = async (req, res) => {
  try {
    const proyecciones = await Projection.find({});
    res.status(200).json(proyecciones);
  } catch (error) {
    console.error('Error al obtener proyecciones:', error);
    res.status(500).json({ error: 'Error interno del servidor al obtener proyecciones' });
  }
};