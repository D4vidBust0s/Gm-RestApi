import Department from "../models/Department";

/**
 * Departamentos iniciales que antes estaban definidos solo en el frontend.
 * Se insertan una única vez, cuando la colección está vacía, para no resucitar
 * departamentos que el administrador haya renombrado o eliminado.
 */
export const DEPARTAMENTOS_INICIALES = [
  { nombre: "Comercial", orden: 1 },
  { nombre: "Noticias", orden: 2 },
  { nombre: "Bravissimo", orden: 3 },
  { nombre: "Exteriores", orden: 4 },
];

export const seedDepartments = async () => {
  const total = await Department.estimatedDocumentCount();
  if (total > 0) return { insertados: 0 };

  await Department.insertMany(DEPARTAMENTOS_INICIALES);
  return { insertados: DEPARTAMENTOS_INICIALES.length };
};
