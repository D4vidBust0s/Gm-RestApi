/*
  API de Assignments: listado, origin elegibles, creación, aceptación temporal,
  descarga y anulación. Las reglas de negocio viven en utils/equipmentCustody.
*/

import {
  CustodiaError,
  aceptarCustodia,
  anularCustodia,
  crearCustodia,
  descargarCustodia,
  listarCustodias,
  listarEventos,
  listarOrigenesElegibles,
  obtenerConfigVerificacion,
  obtenerCustodia,
  obtenerOrigenElegible,
  reiniciarVerificacion,
} from "../utils/equipmentCustody";

const texto = (valor) => String(valor ?? "").trim();

const usuarioSesion = (req) =>
  req.usuario ?? {
    id: texto(req.headers["x-user-id"]),
    nombre: texto(req.headers["x-user-name"]) || "Almacenista",
    rol: texto(req.headers["x-user-role"]),
  };

const responderError = (res, error, fallback) => {
  if (error instanceof CustodiaError) {
    return res.status(error.status).json({
      message: error.message,
      ...(error.extra ?? {}),
    });
  }

  if (error?.status) {
    return res.status(error.status).json({ message: error.message });
  }

  return res.status(500).json({
    message: error?.message || fallback,
  });
};

export const findAssignments = async (req, res) => {
  try {
    const data = await listarCustodias({
      estado: texto(req.query.estado),
      origenTipo: texto(req.query.origenTipo),
      trabajadorId: texto(req.query.trabajadorId),
      q: texto(req.query.q),
      evento: texto(req.query.evento),
      desde: texto(req.query.desde),
      hasta: texto(req.query.hasta),
      page: req.query.page,
      limit: req.query.limit,
    });
    res.json(data);
  } catch (error) {
    responderError(res, error, "No se pudieron listar las Assignments");
  }
};

export const findAssignmentEvents = async (req, res) => {
  try {
    const eventos = await listarEventos({
      estado: texto(req.query.estado),
      origenTipo: texto(req.query.origenTipo),
      desde: texto(req.query.desde),
      hasta: texto(req.query.hasta),
    });
    res.json({ eventos });
  } catch (error) {
    responderError(res, error, "No se pudieron listar los eventos");
  }
};

export const getAssignmentConfig = async (req, res) => {
  res.json(obtenerConfigVerificacion());
};

export const findEligibleOrigins = async (req, res) => {
  try {
    const origenes = await listarOrigenesElegibles({
      desde: texto(req.query.desde),
      hasta: texto(req.query.hasta),
      origenTipo: texto(req.query.origenTipo),
      q: texto(req.query.q),
    });
    res.json({ origenes });
  } catch (error) {
    responderError(
      res,
      error,
      "No se pudieron consultar los requerimientos disponibles"
    );
  }
};

export const findEligibleOrigin = async (req, res) => {
  try {
    const data = await obtenerOrigenElegible(
      req.params.origenTipo,
      req.params.origenId
    );
    res.json(data);
  } catch (error) {
    responderError(res, error, "No se pudo consultar el requerimiento");
  }
};

export const findAssignmentById = async (req, res) => {
  try {
    const data = await obtenerCustodia(req.params.id);
    res.json(data);
  } catch (error) {
    responderError(res, error, "No se pudo consultar la Assignment");
  }
};

export const createAssignment = async (req, res) => {
  const body = req.body ?? {};
  const usuario = usuarioSesion(req);

  try {
    const custodia = await crearCustodia({
      origenTipo: body.origenTipo,
      origenId: body.origenId,
      trabajadorId: body.trabajadorId,
      equipos: body.equipos,
      observaciones: body.observaciones,
      usuario,
    });

    res.status(201).json({
      assignment: {
        id: String(custodia._id),
        codigo: custodia.codigo,
        estado: custodia.estado,
        trabajadorId: custodia.trabajadorId,
        trabajadorNombre: custodia.trabajadorNombre,
        origenTipo: custodia.origenTipo,
        origenId: String(custodia.origenId),
        origenCodigo: custodia.origenCodigo,
        equipos: custodia.equipos.map((item) => ({
          id: String(item._id),
          equipoId: String(item.equipoId),
          placa: item.placaSnapshot,
          estado: item.estado,
        })),
        aceptacion: {
          metodo: custodia.aceptacion?.metodo ?? "temporal",
          estado: custodia.aceptacion?.estado ?? "Pendiente",
        },
      },
    });
  } catch (error) {
    responderError(res, error, "No se pudo crear la Assignment");
  }
};

export const acceptAssignment = async (req, res) => {
  const body = req.body ?? {};
  const usuario = usuarioSesion(req);

  try {
    const data = await aceptarCustodia({
      id: req.params.id,
      codigo: body.codigo,
      revisadoFisicamente:
        body.revisadoFisicamente === true ||
        body.revisadoFisicamente === "true",
      usuario,
    });

    res.json({ assignment: data });
  } catch (error) {
    responderError(res, error, "No se pudo confirmar la entrega");
  }
};

export const retryAssignmentVerification = async (req, res) => {
  const usuario = usuarioSesion(req);

  try {
    const data = await reiniciarVerificacion({
      id: req.params.id,
      usuario,
    });
    res.json({ assignment: data });
  } catch (error) {
    responderError(res, error, "No se pudo reiniciar la verificación");
  }
};

export const downloadAssignment = async (req, res) => {
  const body = req.body ?? {};
  const usuario = usuarioSesion(req);

  try {
    const data = await descargarCustodia({
      id: req.params.id,
      equipos: body.equipos,
      revisadoFisicamente:
        body.revisadoFisicamente === true ||
        body.revisadoFisicamente === "true",
      observaciones: body.observaciones,
      usuario,
    });

    res.json({ assignment: data });
  } catch (error) {
    responderError(res, error, "No se pudo descargar la Assignment");
  }
};

export const cancelAssignment = async (req, res) => {
  const body = req.body ?? {};
  const usuario = usuarioSesion(req);

  try {
    const data = await anularCustodia({
      id: req.params.id,
      motivo: body.motivo,
      usuario,
    });
    res.json({ assignment: data });
  } catch (error) {
    responderError(res, error, "No se pudo anular la Assignment");
  }
};
