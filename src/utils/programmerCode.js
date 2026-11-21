import Counter from "../models/Counter";
import Programmers from "../models/Programmer";

const ANIO_POR_DEFECTO = () => new Date().getFullYear();

/**
 * Genera un código consecutivo anual: REQ-2026-0001.
 * Reintenta si el código ya existe por datos históricos o cargas concurrentes.
 */
export const generarCodigoProgrammer = async (fecha = new Date()) => {
  const anio = Number(String(fecha).slice(0, 4)) || ANIO_POR_DEFECTO();

  for (let intento = 0; intento < 10; intento += 1) {
    const contador = await Counter.findByIdAndUpdate(
      `programmer-${anio}`,
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    const codigo = `REQ-${anio}-${String(contador.seq).padStart(4, "0")}`;
    const existe = await Programmers.exists({ Codigo: codigo });

    if (!existe) return codigo;
  }

  throw new Error("No se pudo generar un código único para el requerimiento");
};
