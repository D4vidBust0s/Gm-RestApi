import Counter from "../models/Counter";
import Programmers from "../models/Programmer";
import Requirement from "../models/Requirement";

const ANIO_POR_DEFECTO = () => new Date().getFullYear();

/**
 * Código consecutivo anual de Requirements: REQ-2026-0001.
 *
 * Usa un contador propio y comprueba también la colección Programmer para que
 * no existan dos códigos visibles iguales entre los dos flujos.
 */
export const generarCodigoRequirement = async (fecha = new Date()) => {
  const anio = Number(String(fecha).slice(0, 4)) || ANIO_POR_DEFECTO();

  for (let intento = 0; intento < 15; intento += 1) {
    const contador = await Counter.findByIdAndUpdate(
      `requirement-${anio}`,
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    const codigo = `REQ-${anio}-${String(contador.seq).padStart(4, "0")}`;

    const [enRequirements, enProgrammer] = await Promise.all([
      Requirement.exists({ codigo }),
      Programmers.exists({ Codigo: codigo }),
    ]);

    if (!enRequirements && !enProgrammer) return codigo;
  }

  throw new Error("No se pudo generar un código único para el requerimiento");
};
