/*
  Backfill único: crea los turnos directos que falten para el personal ya
  asignado en Programmers aprobados o agendados. Es idempotente.

  Ejecutar manualmente:
    npm run migrate:direct-shifts
*/

import mongoose from "mongoose";

import config from "../config";
import Programmers from "../models/Programmer";
import { asegurarTurnosDirectosProgramador } from "../utils/programmerDirectShift";

const ejecutar = async () => {
  await mongoose.connect(config.mongodbURL);

  const programmers = await Programmers.find({
    Estado: { $in: ["Aprobada", "Agendado"] },
  });

  let creados = 0;

  for (const programmer of programmers) {
    try {
      creados += await asegurarTurnosDirectosProgramador(programmer);
    } catch (error) {
      console.error(
        `No se pudieron crear turnos directos para ${programmer._id}:`,
        error?.message || error
      );
    }
  }

  console.log(
    `Turnos directos creados: ${creados} para ${programmers.length} Programmer(s).`
  );

  await mongoose.disconnect();
};

ejecutar().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
