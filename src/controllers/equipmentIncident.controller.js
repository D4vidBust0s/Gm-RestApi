import {
  agregarNotaIncidente,
  cerrarIncidente,
  listarIncidentes,
  obtenerIncidente,
} from "../utils/equipmentIncidents";

const texto = (valor) => String(valor ?? "").trim();

const usuarioSesion = (req) =>
  req.usuario ?? {
    id: texto(req.headers["x-user-id"]),
    nombre: texto(req.headers["x-user-name"]) || "Almacenista",
    rol: texto(req.headers["x-user-role"]),
  };

const responderError = (res, error, fallback) => {
  if (error?.status) {
    return res.status(error.status).json({ message: error.message });
  }
  return res.status(500).json({ message: error?.message || fallback });
};

export const findIncidents = async (req, res) => {
  try {
    const incidentes = await listarIncidentes({
      estado: texto(req.query.estado),
      q: texto(req.query.q),
    });
    res.json({ incidentes });
  } catch (error) {
    responderError(res, error, "No se pudieron listar los casos especiales");
  }
};

export const findIncidentById = async (req, res) => {
  try {
    const incidente = await obtenerIncidente(req.params.id);
    res.json(incidente);
  } catch (error) {
    responderError(res, error, "No se pudo consultar el caso especial");
  }
};

export const addIncidentNote = async (req, res) => {
  try {
    const incidente = await agregarNotaIncidente({
      id: req.params.id,
      texto: req.body?.texto,
      usuario: usuarioSesion(req),
    });
    res.json({ incidente });
  } catch (error) {
    responderError(res, error, "No se pudo agregar la nota");
  }
};

export const closeIncident = async (req, res) => {
  try {
    const incidente = await cerrarIncidente({
      id: req.params.id,
      resultado: req.body?.resultado,
      nota: req.body?.nota,
      usuario: usuarioSesion(req),
    });
    res.json({ incidente });
  } catch (error) {
    responderError(res, error, "No se pudo cerrar el caso especial");
  }
};
