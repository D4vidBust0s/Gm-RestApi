/*
  Migración única: las imágenes dejan de vivir en cada equipo y pasan a ser
  genéricas por categoría (o subcategoría, cuando exista).

  - Si una categoría no tiene imagen, toma la primera imagen de un equipo de
    esa categoría.
  - Después elimina `imagen` e `imagenMiniatura` de todos los equipos.

  Ejecutar manualmente:
    npm run migrate:equipment-images
*/

import mongoose from "mongoose";

import config from "../config";
import Equipment from "../models/Equipment";
import EquipmentCategory from "../models/EquipmentCategory";

const ejecutar = async () => {
  await mongoose.connect(config.mongodbURL);

  let categoriasConImagen = 0;
  let imagenesEliminadas = 0;

  const categorias = await EquipmentCategory.find().lean();

  for (const categoria of categorias) {
    if (categoria.imagen?.dataUrl) continue;

    const equipo = await Equipment.findOne({
      categoriaId: categoria._id,
      "imagen.dataUrl": { $exists: true, $ne: "" },
    })
      .select("imagen imagenMiniatura")
      .lean();

    if (!equipo?.imagen?.dataUrl) continue;

    await EquipmentCategory.updateOne(
      { _id: categoria._id },
      {
        $set: {
          imagen: equipo.imagen,
          imagenMiniatura: equipo.imagenMiniatura ?? null,
        },
      }
    );
    categoriasConImagen += 1;
  }

  const equiposConImagen = await Equipment.countDocuments({
    "imagen.dataUrl": { $exists: true, $ne: "" },
  });

  const resultado = await Equipment.updateMany(
    {},
    { $unset: { imagen: "", imagenMiniatura: "" } }
  );

  imagenesEliminadas = equiposConImagen;

  console.log(
    `Migración de imágenes: ${categoriasConImagen} categoría(s) recibieron imagen, ` +
      `${imagenesEliminadas} equipo(s) quedaron sin imagen propia (${resultado.modifiedCount} documentos actualizados).`
  );

  await mongoose.disconnect();
};

ejecutar().catch(async (error) => {
  console.error("No se pudo completar la migración:", error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
