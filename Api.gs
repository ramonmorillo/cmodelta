function apiResponseOk(data) { return { ok: true, data: data }; }
function apiResponseError(error) { return { ok: false, error: error && error.message ? error.message : String(error) }; }

function apiGetInitialData() {
  try {
    return apiResponseOk({
      appTitle: APP_TITLE,
      appSubtitle: APP_SUBTITLE,
      dataWarning: DATA_WARNING,
      pacientes: apiListPacientes('').data
    });
  } catch (e) {
    return apiResponseError(e);
  }
}

function apiListPacientes(query) {
  try {
    const all = getSheetDataObject('Pacientes');
    const q = String(query || '').trim().toLowerCase();
    const filtered = !q ? all : all.filter((p) => String(p.codigoPaciente || '').toLowerCase().includes(q));
    filtered.sort((a, b) => String(a.codigoPaciente || '').localeCompare(String(b.codigoPaciente || '')));
    return apiResponseOk(filtered);
  } catch (e) { return apiResponseError(e); }
}

function apiSavePaciente(payload) {
  try {
    validateRequired(payload, ['codigoPaciente', 'centro', 'fechaAlta', 'estado', 'tratamientoActivo', 'nivelCMOActual']);
    validateDate(payload.fechaAlta, 'fechaAlta');

    const now = toIsoDateTime(new Date());
    const user = getCurrentUserEmail();
    const all = getSheetDataObject('Pacientes');
    const normalizedCode = String(payload.codigoPaciente).trim().toUpperCase();

    const duplicate = all.find((p) => String(p.codigoPaciente || '').trim().toUpperCase() === normalizedCode && String(p.idPaciente) !== String(payload.idPaciente || ''));
    if (duplicate) throw new Error('Ya existe un paciente con ese codigoPaciente.');

    if (!payload.idPaciente) {
      const idPaciente = createUniqueId('PAC');
      appendObject('Pacientes', {
        idPaciente: idPaciente,
        codigoPaciente: normalizedCode,
        centro: String(payload.centro).trim(),
        fechaAlta: toDateOnly(payload.fechaAlta),
        estado: payload.estado,
        tratamientoActivo: payload.tratamientoActivo,
        nivelCMOActual: payload.nivelCMOActual,
        fechaUltimaVisita: '',
        observaciones: payload.observaciones || '',
        createdAt: now,
        updatedAt: now,
        createdBy: user,
        updatedBy: user
      });
      logAudit('CREATE', 'Pacientes', idPaciente, 'Alta de paciente ' + normalizedCode);
      return apiResponseOk({ idPaciente: idPaciente, mode: 'created' });
    }

    const changes = {
      codigoPaciente: normalizedCode,
      centro: String(payload.centro).trim(),
      fechaAlta: toDateOnly(payload.fechaAlta),
      estado: payload.estado,
      tratamientoActivo: payload.tratamientoActivo,
      nivelCMOActual: payload.nivelCMOActual,
      observaciones: payload.observaciones || '',
      updatedAt: now,
      updatedBy: user
    };
    const updated = updateObjectById('Pacientes', 'idPaciente', payload.idPaciente, changes);
    if (!updated) throw new Error('Paciente no encontrado para actualizar.');
    logAudit('UPDATE', 'Pacientes', payload.idPaciente, 'Actualización de paciente ' + normalizedCode);
    return apiResponseOk({ idPaciente: payload.idPaciente, mode: 'updated' });
  } catch (e) { return apiResponseError(e); }
}

function apiGetPacienteDashboard(idPaciente) {
  try {
    validatePatientSelected(idPaciente);
    const paciente = getSheetDataObject('Pacientes').find((p) => String(p.idPaciente) === String(idPaciente));
    if (!paciente) throw new Error('Paciente no encontrado.');

    const byPatient = function (sheetName) {
      return getSheetDataObject(sheetName).filter((r) => String(r.idPaciente) === String(idPaciente));
    };
    const sortByDateDesc = function (arr, dateField) {
      return arr.sort((a, b) => String(b[dateField] || b.createdAt || '').localeCompare(String(a[dateField] || a.createdAt || '')));
    };

    const visitas = sortByDateDesc(byPatient('VisitasCMO'), 'fecha');
    const dispensaciones = sortByDateDesc(byPatient('Dispensaciones'), 'fechaReal');
    const activacionList = sortByDateDesc(byPatient('ActivacionPaciente'), 'fecha');
    const autoadministracionList = sortByDateDesc(byPatient('Autoadministracion'), 'fecha');
    const respuestaList = sortByDateDesc(byPatient('Respuesta'), 'fecha');
    const seguridad = sortByDateDesc(byPatient('Seguridad'), 'fecha');
    const intervenciones = sortByDateDesc(byPatient('IntervencionesCMO'), 'fecha');

    return apiResponseOk({
      paciente: paciente,
      visitas: visitas,
      dispensaciones: dispensaciones,
      activacion: activacionList,
      autoadministracion: autoadministracionList,
      respuesta: respuestaList,
      seguridad: seguridad,
      intervenciones: intervenciones
    });
  } catch (e) { return apiResponseError(e); }
}

function apiAddVisita(data) {
  try {
    validatePatientSelected(data.idPaciente);
    validateRequired(data, ['fecha', 'tipoVisita', 'modalidad', 'nivelCMO']);
    validateDate(data.fecha, 'fecha');

    const idVisita = createUniqueId('VIS');
    const payload = Object.assign({}, data, { fecha: toDateOnly(data.fecha) });
    appendCommon('VisitasCMO', 'idVisita', idVisita, payload);

    const now = toIsoDateTime(new Date());
    const user = getCurrentUserEmail();
    updateObjectById('Pacientes', 'idPaciente', data.idPaciente, {
      fechaUltimaVisita: toDateOnly(data.fecha),
      nivelCMOActual: data.nivelCMO,
      updatedAt: now,
      updatedBy: user
    });
    logAudit('CREATE', 'VisitasCMO', idVisita, 'Visita CMO para ' + data.idPaciente);
    return apiResponseOk({ idVisita: idVisita });
  } catch (e) { return apiResponseError(e); }
}

function apiAddDispensacion(data) {
  try {
    validatePatientSelected(data.idPaciente);
    validateRequired(data, ['fechaPrevista', 'fechaReal']);
    validateDate(data.fechaPrevista, 'fechaPrevista');
    validateDate(data.fechaReal, 'fechaReal');
    const retraso = calculateDelayDays(data.fechaPrevista, data.fechaReal);
    const id = createUniqueId('DSP');
    appendCommon('Dispensaciones', 'idDispensacion', id, Object.assign({}, data, {
      fechaPrevista: toDateOnly(data.fechaPrevista),
      fechaReal: toDateOnly(data.fechaReal),
      retrasoDias: retraso
    }));
    logAudit('CREATE', 'Dispensaciones', id, 'Dispensación para ' + data.idPaciente);
    return apiResponseOk({ idDispensacion: id, retrasoDias: retraso });
  } catch (e) { return apiResponseError(e); }
}

function apiAddActivacion(data) {
  try {
    validatePatientSelected(data.idPaciente);
    const items = ['enfermedad', 'objetivoTratamiento', 'administracion', 'conservacion', 'olvidos', 'efectosAdversos', 'contacto', 'decisiones'];
    items.forEach((k) => validateScore0to2(data[k], k));
    const puntuacionTotal = items.reduce((sum, k) => sum + Number(data[k] || 0), 0);
    const nivelActivacion = puntuacionTotal <= 5 ? 'baja activación' : puntuacionTotal <= 11 ? 'activación intermedia' : 'alta activación';
    const id = createUniqueId('ACT');
    appendCommon('ActivacionPaciente', 'idRegistro', id, Object.assign({}, data, {
      fecha: toDateOnly(data.fecha || new Date()),
      puntuacionTotal: puntuacionTotal,
      nivelActivacion: nivelActivacion
    }));
    logAudit('CREATE', 'ActivacionPaciente', id, 'Activación para ' + data.idPaciente);
    return apiResponseOk({ idRegistro: id, puntuacionTotal: puntuacionTotal, nivelActivacion: nivelActivacion });
  } catch (e) { return apiResponseError(e); }
}

function apiAddAutoadministracion(data) {
  try {
    validatePatientSelected(data.idPaciente);
    validateRequired(data, ['fecha', 'resultadoGlobal']);
    const id = createUniqueId('AUT');
    appendCommon('Autoadministracion', 'idRegistro', id, Object.assign({}, data, { fecha: toDateOnly(data.fecha) }));
    logAudit('CREATE', 'Autoadministracion', id, 'Autoadministración para ' + data.idPaciente);
    return apiResponseOk({ idRegistro: id });
  } catch (e) { return apiResponseError(e); }
}

function apiAddRespuesta(data) {
  try {
    validatePatientSelected(data.idPaciente);
    validateRequired(data, ['fecha', 'respuestaGlobal', 'requiereRevisionMedica']);
    const id = createUniqueId('RSP');
    appendCommon('Respuesta', 'idRespuesta', id, Object.assign({}, data, { fecha: toDateOnly(data.fecha) }));
    logAudit('CREATE', 'Respuesta', id, 'Respuesta para ' + data.idPaciente);
    return apiResponseOk({ idRespuesta: id });
  } catch (e) { return apiResponseError(e); }
}

function apiAddSeguridad(data) {
  try {
    validatePatientSelected(data.idPaciente);
    validateRequired(data, ['fecha', 'tipoEvento', 'gravedad']);
    const id = createUniqueId('SEG');
    appendCommon('Seguridad', 'idEvento', id, Object.assign({}, data, { fecha: toDateOnly(data.fecha) }));
    logAudit('CREATE', 'Seguridad', id, 'Evento seguridad para ' + data.idPaciente);
    return apiResponseOk({ idEvento: id });
  } catch (e) { return apiResponseError(e); }
}

function apiAddIntervencion(data) {
  try {
    validatePatientSelected(data.idPaciente);
    validateRequired(data, ['fecha', 'dominioCMO', 'tipoIntervencion']);
    const id = createUniqueId('INT');
    appendCommon('IntervencionesCMO', 'idIntervencion', id, Object.assign({}, data, { fecha: toDateOnly(data.fecha) }));
    logAudit('CREATE', 'IntervencionesCMO', id, 'Intervención para ' + data.idPaciente);
    return apiResponseOk({ idIntervencion: id });
  } catch (e) { return apiResponseError(e); }
}

function appendCommon(sheet, idField, idValue, data) {
  const now = toIsoDateTime(new Date());
  const user = getCurrentUserEmail();
  appendObject(sheet, Object.assign({}, data, {
    [idField]: idValue,
    createdAt: now,
    updatedAt: now,
    createdBy: user,
    updatedBy: user
  }));
}

function validateRequired(data, fields) { fields.forEach((f) => { if (data[f] === undefined || data[f] === null || String(data[f]).trim() === '') throw new Error('Campo obligatorio: ' + f); }); }
function validateDate(value, field) { const d = new Date(value); if (isNaN(d.getTime())) throw new Error('Fecha inválida en ' + field); }
function validatePatientSelected(idPaciente) { if (!idPaciente) throw new Error('Debe seleccionar un paciente.'); }
function validateScore0to2(value, field) { const n = Number(value); if (isNaN(n) || n < 0 || n > 2) throw new Error('El campo ' + field + ' debe estar entre 0 y 2.'); }
function calculateDelayDays(fechaPrevista, fechaReal) { const diff = Math.floor((new Date(fechaReal) - new Date(fechaPrevista)) / 86400000); return diff > 0 ? diff : 0; }
