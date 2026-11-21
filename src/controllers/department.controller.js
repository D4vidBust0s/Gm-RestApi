/*
  CRUD de departamentos compartido por Requirements y Programmer.
*/

import Department from "../models/Department";
import Programmers from "../models/Programmer";
import Requirement from "../models/Requirement";
import { broadcast } from "../realtime";

const texto = (valor) => (typeof valor === "string" ? valor.trim() : "");

const normalizar = (valor) =>
  texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const escaparRegex = (valor) =>
  String(valor ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const nombreDuplicado = async (nombre, excluirId = null) => {
  const lista = await Department.find({}, "nombre").lean();
  const objetivo = normalizar(nombre);

  return lista.some(
    (departamento) =>
      normalizar(departamento.nombre) === objetivo &&
      String(departamento._id) !== String(excluirId ?? "")
  );
};

export const findAllDepartments = async (req, res) => {
  try {
    const departamentos = await Department.find().sort({
      orden: 1,
      nombre: 1,
    });
    res.json(departamentos);
  } catch (error) {
    res.status(500).json({
      message: "No se pudieron listar los departamentos",
    });
  }
};

export const createDepartment = async (req, res) => {
  const nombre = texto(req.body?.nombre);

  if (!nombre) {
    return res.status(400).json({ message: "El nombre es obligatorio" });
  }

  if (nombre.length > 40) {
    return res
      .status(400)
      .json({ message: "El nombre no puede superar los 40 caracteres" });
  }

  try {
    if (await nombreDuplicado(nombre)) {
      return res
        .status(409)
        .json({ message: "Ya existe un departamento con ese nombre" });
    }

    const ultimo = await Department.findOne().sort({ orden: -1 }).lean();
    const orden = Number(req.body?.orden);
    const nuevo = await Department.create({
      nombre,
      orden: Number.isFinite(orden) ? orden : Number(ultimo?.orden ?? 0) + 1,
    });

    broadcast("departments:changed", {
      action: "created",
      id: String(nuevo._id),
    });

    res.status(201).json(nuevo);
  } catch (error) {
    res.status(500).json({
      message: error.message || "No se pudo crear el departamento",
    });
  }
};

export const updateDepartment = async (req, res) => {
  const { id } = req.params;
  const nombre = texto(req.body?.nombre);

  if (!nombre) {
    return res.status(400).json({ message: "El nombre es obligatorio" });
  }

  try {
    const actual = await Department.findById(id);
    if (!actual) {
      return res.status(404).json({ message: "El departamento no existe" });
    }

    if (await nombreDuplicado(nombre, id)) {
      return res
        .status(409)
        .json({ message: "Ya existe un departamento con ese nombre" });
    }

    const nombreAnterior = actual.nombre;
    actual.nombre = nombre;

    if (req.body?.orden !== undefined) {
      const orden = Number(req.body.orden);
      if (Number.isFinite(orden)) actual.orden = orden;
    }

    const guardado = await actual.save();

    // Los requerimientos guardan el nombre del departamento, no su ID.
    if (normalizar(nombreAnterior) !== normalizar(nombre)) {
      await Programmers.updateMany(
        {
          Departamento: new RegExp(
            `^${escaparRegex(nombreAnterior)}$`,
            "i"
          ),
        },
        { $set: { Departamento: nombre } }
      );

      await Requirement.updateMany(
        { departamentoId: actual._id },
        { $set: { departamentoNombre: nombre } }
      );
    }

    broadcast("departments:changed", {
      action: "updated",
      id: String(guardado._id),
    });

    res.json(guardado);
  } catch (error) {
    res.status(500).json({
      message: error.message || "No se pudo actualizar el departamento",
    });
  }
};

export const deleteDepartment = async (req, res) => {
  const { id } = req.params;

  try {
    const departamento = await Department.findById(id);
    if (!departamento) {
      return res.status(404).json({ message: "El departamento no existe" });
    }

    const total = await Department.estimatedDocumentCount();
    if (total <= 1) {
      return res.status(400).json({
        message: "Debe existir al menos un departamento",
      });
    }

    const enUso = await Programmers.exists({
      Departamento: new RegExp(
        `^${escaparRegex(departamento.nombre)}$`,
        "i"
      ),
    });

    if (enUso) {
      return res.status(409).json({
        message:
          "No se puede eliminar un departamento con requerimientos asociados",
      });
    }

    const enRequirements = await Requirement.exists({
      departamentoId: departamento._id,
    });

    if (enRequirements) {
      return res.status(409).json({
        message:
          "No se puede eliminar un departamento con solicitudes de Requirements asociadas",
      });
    }

    await Department.findByIdAndDelete(id);

    broadcast("departments:changed", {
      action: "deleted",
      id: String(departamento._id),
    });

    res.json({
      message: `Departamento "${departamento.nombre}" eliminado`,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message || "No se pudo eliminar el departamento",
    });
  }
};
