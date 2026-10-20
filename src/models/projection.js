const mongoose = require('mongoose');

const projectionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payroll', required: true },
  fechaClave: { type: String, required: true }, // Guardaremos la fecha en formato ISO (ej. '2026-10-19T00:00:00.000Z')
  valorProyeccion: { type: Number, required: true, default: 0 },
  grupoId: { type: String, required: true }
}, {
  timestamps: true
});

// Índice compuesto único para evitar duplicados por usuario y fecha, permitiendo upsert rápido
projectionSchema.index({ userId: 1, fechaClave: 1 }, { unique: true });

module.exports = mongoose.model('Projection', projectionSchema);