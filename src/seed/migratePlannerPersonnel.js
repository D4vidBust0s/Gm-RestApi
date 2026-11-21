/*
  Backfill único: sincroniza el personal de los Programmer con los turnos
  Type "Programmer" que ya existen. Es idempotente.

  Ejecutar manualmente:
    npm run migrate:planner-personnel
*/

import mongoose from "mongoose";

import config from "../config";
import Shifts from "../models/Shifts";
import { sincronizarPersonalProgramadorDesdeTurno } from "../utils/programmerShiftSync";

const ejecutar = async () => {
  await mongoose.connect(config.mongodbURL);

  const turnos = await Shifts.find({ Type: "Programmer" }).lean();
  let sincronizados = 0;

  for (const turno of turnos) {
    try {
      const actualizado = await sincronizarPersonalProgramadorDesdeTurno(turno);
      if (actualizado) sincronizados += 1;
    } catch (error) {
      console.error(
        `No se pudo sincronizar el turno ${turno._id}:`,
        error?.message || error
      );
    }
  }

  console.log(
    `Sincronización de personal desde turnos: ${sincronizados} Programmer(s) actualizados de ${turnos.length} turno(s).`
  );

  await mongoose.disconnect();
};

ejecutar().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
