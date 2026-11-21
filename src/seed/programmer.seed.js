import Programmers from "../models/Programmer";
import { generarCodigoProgrammer } from "../utils/programmerCode";

/**
 * Migración idempotente de los programadores históricos:
 *  - los registros creados antes del flujo de aprobación quedan Aprobados
 *    para que ModalPlanner1 no pierda la programación existente;
 *  - se inicializa Revision para el control de concurrencia;
 *  - se asigna un código consecutivo a los registros que no lo tienen.
 */
export const migrateLegacyProgrammers = async () => {
  await Programmers.updateMany(
    {
      $or: [
        { Estado: { $exists: false } },
        { Estado: null },
        { Estado: "" },
      ],
    },
    { $set: { Estado: "Aprobada" } }
  );

  await Programmers.updateMany(
    { Revision: { $exists: false } },
    { $set: { Revision: 0 } }
  );

  await Programmers.updateMany(
    { Codigo: "" },
    { $unset: { Codigo: "" } }
  );

  const sinCodigo = await Programmers.find({
    $or: [{ Codigo: { $exists: false } }, { Codigo: null }],
  })
    .select("_id Fecha_clave createdAt")
    .lean();

  for (const registro of sinCodigo) {
    const codigo = await generarCodigoProgrammer(
      registro.Fecha_clave ?? registro.createdAt ?? new Date()
    );

    await Programmers.updateOne(
      { _id: registro._id },
      { $set: { Codigo: codigo } }
    );
  }

  return { codificados: sinCodigo.length };
};
