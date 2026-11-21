/*
  Contrato JSON de las Assignments y de los casos especiales.
  Nunca expone el código de aprobación: la UI lo obtiene de /assignments/config.
*/

const texto = (valor) => String(valor ?? "").trim();

const idDe = (valor) => {
  if (!valor) return "";
  if (typeof valor === "object") return String(valor._id ?? valor.id ?? "");
  return String(valor);
};

const fecha = (valor) => valor ?? null;

const mapearEquipo = (item, imagenesPorEquipo = null) => ({
  id: String(item?._id ?? item?.id ?? ""),
  equipoId: idDe(item?.equipoId),
  placa: texto(item?.placaSnapshot),
  descripcion: texto(item?.descripcionSnapshot),
  categoria: texto(item?.categoriaSnapshot),
  subcategoria: texto(item?.subcategoriaSnapshot),
  imagen: imagenesPorEquipo?.get(idDe(item?.equipoId)) ?? null,
  reservaId: idDe(item?.reservaId) || null,
  estado: texto(item?.estado),
  resultadoDescarga: item?.resultadoDescarga ?? null,
  novedadTipo: item?.novedadTipo ?? null,
  novedadDescripcion: texto(item?.novedadDescripcion),
  accionNovedad: item?.accionNovedad ?? null,
  mantenimientoId: idDe(item?.mantenimientoId) || null,
  incidenteId: idDe(item?.incidenteId) || null,
});

const mapearHistorial = (item) => ({
  id: String(item?._id ?? item?.id ?? ""),
  tipo: texto(item?.tipo),
  detalle: texto(item?.detalle),
  por: texto(item?.por),
  porId: texto(item?.porId),
  el: fecha(item?.el),
  meta: item?.meta ?? {},
});

export const serializarCustodia = (
  custodia,
  { incluirHistorial = false, imagenesPorEquipo = null } = {}
) => {
  if (!custodia) return null;

  return {
    id: String(custodia._id ?? custodia.id ?? ""),
    codigo: texto(custodia.codigo),
    origen: {
      tipo: texto(custodia.origenTipo),
      id: idDe(custodia.origenId),
      codigo: texto(custodia.origenCodigo),
      nombre: texto(custodia.origenNombre),
      fecha: fecha(custodia.origenFecha),
      estado: texto(custodia.origenEstado),
    },
    trabajador: {
      id: texto(custodia.trabajadorId),
      nombre: texto(custodia.trabajadorNombre),
      cargo: texto(custodia.trabajadorCargo),
      grupoId: texto(custodia.trabajadorGrupoId),
      grupoNombre: texto(custodia.trabajadorGrupoNombre),
    },
    estado: texto(custodia.estado),
    activa: Boolean(custodia.activa),
    observaciones: texto(custodia.observaciones),
    equipos: (Array.isArray(custodia.equipos) ? custodia.equipos : []).map(
      (item) => mapearEquipo(item, imagenesPorEquipo)
    ),
    aceptacion: {
      metodo: texto(custodia.aceptacion?.metodo) || "temporal",
      estado: texto(custodia.aceptacion?.estado) || "Pendiente",
      intentos: Number(custodia.aceptacion?.intentos) || 0,
      bloqueada: Boolean(custodia.aceptacion?.bloqueada),
      revisadoFisicamente: Boolean(
        custodia.aceptacion?.revisadoFisicamente
      ),
      aceptadaEn: fecha(custodia.aceptacion?.aceptadaEn),
      registradaPor: texto(custodia.aceptacion?.registradaPor),
      registradaPorId: texto(custodia.aceptacion?.registradaPorId),
    },
    creadaPor: texto(custodia.creadaPor),
    creadaPorId: texto(custodia.creadaPorId),
    creadaEn: fecha(custodia.creadaEn ?? custodia.createdAt),
    descarga: {
      realizadaPor: texto(custodia.descarga?.realizadaPor),
      realizadaPorId: texto(custodia.descarga?.realizadaPorId),
      realizadaEn: fecha(custodia.descarga?.realizadaEn),
      revisadoFisicamente: Boolean(
        custodia.descarga?.revisadoFisicamente
      ),
      resultado: custodia.descarga?.resultado ?? null,
      observaciones: texto(custodia.descarga?.observaciones),
      novedadId: idDe(custodia.descarga?.novedadId) || null,
      aprobadaPor: texto(custodia.descarga?.aprobadaPor),
      aprobadaPorId: texto(custodia.descarga?.aprobadaPorId),
    },
    descargaEnProceso: Boolean(custodia.descargaEnProceso),
    anulada: {
      por: texto(custodia.anulada?.por),
      porId: texto(custodia.anulada?.porId),
      en: fecha(custodia.anulada?.en),
      motivo: texto(custodia.anulada?.motivo),
    },
    historial: incluirHistorial
      ? (Array.isArray(custodia.historial) ? custodia.historial : []).map(
          mapearHistorial
        )
      : undefined,
    createdAt: fecha(custodia.createdAt),
    updatedAt: fecha(custodia.updatedAt),
  };
};

export const serializarIncidente = (
  incidente,
  { incluirNotas = true } = {}
) => {
  if (!incidente) return null;

  return {
    id: String(incidente._id ?? incidente.id ?? ""),
    equipoId: idDe(incidente.equipoId),
    placa: texto(incidente.placaSnapshot),
    custodiaId: idDe(incidente.custodiaId) || null,
    trabajador: {
      id: texto(incidente.trabajadorId),
      nombre: texto(incidente.trabajadorNombre),
    },
    origen: {
      tipo: texto(incidente.origenTipo),
      id: idDe(incidente.origenId),
      codigo: texto(incidente.origenCodigo),
    },
    tipo: texto(incidente.tipo),
    descripcion: texto(incidente.descripcion),
    estado: texto(incidente.estado),
    notas: incluirNotas
      ? (Array.isArray(incidente.notas) ? incidente.notas : []).map((nota) => ({
          id: String(nota?._id ?? nota?.id ?? ""),
          texto: texto(nota?.texto),
          por: texto(nota?.por),
          porId: texto(nota?.porId),
          el: fecha(nota?.el),
        }))
      : undefined,
    reportadoPor: texto(incidente.reportadoPor),
    reportadoPorId: texto(incidente.reportadoPorId),
    reportadoEn: fecha(incidente.reportadoEn),
    resolucion: {
      resultado: incidente.resolucion?.resultado ?? null,
      nota: texto(incidente.resolucion?.nota),
      por: texto(incidente.resolucion?.por),
      porId: texto(incidente.resolucion?.porId),
      el: fecha(incidente.resolucion?.el),
    },
    createdAt: fecha(incidente.createdAt),
    updatedAt: fecha(incidente.updatedAt),
  };
};
