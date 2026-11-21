/*
  Migración única del estado Agendado.

  - Un Programmer/Requirement en Aprobada con todo el personal asignado pasa
    a Agendado.
  - Un Agendado con personal incompleto vuelve a Aprobada.

  No modifica personal, equipos ni reservas. Ejecutar manualmente:
    npm run migrate:agendado
*/

import mongoose from "mongoose";

import config from "../config";
import Programmers from "../models/Programmer";
import Requirement from "../models/Requirement";
import { estadoTrasAsignacion } from "../utils/programmerRules";

const ESTADOS_OPERATIVOS = ["Aprobada", "Agendado"];

const migrarProgrammers = async () => {
  const registros = await Programmers.find({
    Estado: { $in: ESTADOS_OPERATIVOS },
  })
    .select("_id Estado Personal")
    .lean();

  let actualizados = 0;

  for (const registro of registros) {
    const estadoNuevo = estadoTrasAsignacion(
      registro.Estado,
      registro.Personal ?? []
    );

    if (estadoNuevo === registro.Estado) continue;

    await Programmers.updateOne(
      { _id: registro._id },
      { $set: { Estado: estadoNuevo }, $inc: { Revision: 1 } }
    );
    actualizados += 1;
  }

  return actualizados;
};

const migrarRequirements = async () => {
  const registros = await Requirement.find({
    estado: { $in: ESTADOS_OPERATIVOS },
  })
    .select("_id estado personal")
    .lean();

  let actualizados = 0;

  for (const registro of registros) {
    const estadoNuevo = estadoTrasAsignacion(
      registro.estado,
      registro.personal ?? []
    );

    if (estadoNuevo === registro.estado) continue;

    await Requirement.updateOne(
      { _id: registro._id },
      { $set: { estado: estadoNuevo }, $inc: { revision: 1 } }
    );
    actualizados += 1;
  }

  return actualizados;
};

const ejecutar = async () => {
  await mongoose.connect(config.mongodbURL);

  const programmers = await migrarProgrammers();
  const requirements = await migrarRequirements();

  console.log(
    `Agendado migrado: ${programmers} Programmer(s), ${requirements} Requirement(s).`
  );

  await mongoose.disconnect();
};

ejecutar().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
