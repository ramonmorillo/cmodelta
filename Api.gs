function apiResponseOk(data) { return { ok: true, data: data }; }
function apiResponseError(error) { return { ok: false, error: error && error.message ? error.message : String(error) }; }

function listPatients(query) {
  const all = getSheetDataObject('Pacientes');
  const q = String(query || '').trim().toLowerCase();
  const filtered = !q ? all : all.filter((p) => String(p.codigoPaciente || '').toLowerCase().includes(q));
  filtered.sort((a, b) => String(a.codigoPaciente || '').localeCompare(String(b.codigoPaciente || '')));
  return apiResponseOk(filtered);
}

function createPatient(data) {
  try {
    validateRequired(data, ['codigoPaciente', 'centro', 'fechaAlta', 'estado', 'tratamientoActivo', 'nivelCMOActual']);
    validateDate(data.fechaAlta, 'fechaAlta');
    const normalizedCode = String(data.codigoPaciente).trim().toUpperCase();
    const all = getSheetDataObject('Pacientes');
    const duplicate = all.find((p) => String(p.codigoPaciente || '').trim().toUpperCase() === normalizedCode);
    if (duplicate) throw new Error('Ya existe un paciente con ese codigoPaciente.');

    const now = toIsoDateTime(new Date());
    const user = getCurrentUserEmail();
    const idPaciente = createUniqueId('PAC');
    appendObject('Pacientes', {
      idPaciente: idPaciente, codigoPaciente: normalizedCode, centro: String(data.centro).trim(),
      fechaAlta: toDateOnly(data.fechaAlta), estado: data.estado, tratamientoActivo: data.tratamientoActivo,
      nivelCMOActual: data.nivelCMOActual, fechaUltimaVisita: '', observaciones: data.observaciones || '',
      createdAt: now, updatedAt: now, createdBy: user, updatedBy: user
    });
    logAudit('CREATE', 'Pacientes', idPaciente, 'Alta de paciente ' + normalizedCode);
    return apiResponseOk({ idPaciente: idPaciente });
  } catch (e) { return apiResponseError(e); }
}

function updatePatient(idPaciente, data) {
  try {
    validatePatientSelected(idPaciente);
    validateRequired(data, ['codigoPaciente', 'centro', 'fechaAlta', 'estado', 'tratamientoActivo', 'nivelCMOActual']);
    validateDate(data.fechaAlta, 'fechaAlta');
    const normalizedCode = String(data.codigoPaciente).trim().toUpperCase();
    const all = getSheetDataObject('Pacientes');
    const duplicate = all.find((p) => String(p.codigoPaciente || '').trim().toUpperCase() === normalizedCode && String(p.idPaciente) !== String(idPaciente));
    if (duplicate) throw new Error('Ya existe un paciente con ese codigoPaciente.');

    const changes = {
      codigoPaciente: normalizedCode, centro: String(data.centro).trim(), fechaAlta: toDateOnly(data.fechaAlta), estado: data.estado,
      tratamientoActivo: data.tratamientoActivo, nivelCMOActual: data.nivelCMOActual, observaciones: data.observaciones || '',
      updatedAt: toIsoDateTime(new Date()), updatedBy: getCurrentUserEmail()
    };
    const updated = updateObjectById('Pacientes', 'idPaciente', idPaciente, changes);
    if (!updated) throw new Error('Paciente no encontrado para actualizar.');
    logAudit('UPDATE', 'Pacientes', idPaciente, 'Actualización de paciente ' + normalizedCode);
    return apiResponseOk({ idPaciente: idPaciente });
  } catch (e) { return apiResponseError(e); }
}

function getPatientBundle(idPaciente) {
  try {
    validatePatientSelected(idPaciente);
    const patient = getSheetDataObject('Pacientes').find((p) => String(p.idPaciente) === String(idPaciente));
    if (!patient) throw new Error('Paciente no encontrado.');
    const byPatient = function (sheetName) { return getSheetDataObject(sheetName).filter((r) => String(r.idPaciente) === String(idPaciente)); };
    const sortDesc = function (arr, f) { return arr.sort((a, b) => String(b[f] || '').localeCompare(String(a[f] || ''))); };
    const bundle = {
      patient: patient,
      visits: sortDesc(byPatient('VisitasCMO'), 'fecha'),
      dispensations: sortDesc(byPatient('Dispensaciones'), 'fechaReal'),
      activations: sortDesc(byPatient('ActivacionPaciente'), 'fecha'),
      selfAdministration: sortDesc(byPatient('Autoadministracion'), 'fecha'),
      responses: sortDesc(byPatient('Respuesta'), 'fecha'),
      safetyEvents: sortDesc(byPatient('Seguridad'), 'fecha'),
      interventions: sortDesc(byPatient('IntervencionesCMO'), 'fecha')
    };
    bundle.reportHtml = buildReportHtml(bundle, '');
    return apiResponseOk(bundle);
  } catch (e) { return apiResponseError(e); }
}

function createVisit(data) { return apiAddVisita(data); }
function createDispensation(data) { return apiAddDispensacion(data); }
function createActivation(data) { return apiAddActivacion(data); }
function createSelfAdministration(data) { return apiAddAutoadministracion(data); }
function createResponse(data) { return apiAddRespuesta(data); }
function createSafetyEvent(data) { return apiAddSeguridad(data); }
function createIntervention(data) { return apiAddIntervencion(data); }

function apiGetInitialData() { try { return apiResponseOk({ appTitle: APP_TITLE, appSubtitle: APP_SUBTITLE, dataWarning: DATA_WARNING, pacientes: listPatients('').data }); } catch (e) { return apiResponseError(e); } }
function apiListPacientes(query) { return listPatients(query); }
function apiSavePaciente(payload) { return payload && payload.idPaciente ? updatePatient(payload.idPaciente, payload) : createPatient(payload); }
function apiGetPacienteDashboard(idPaciente) { return getPatientBundle(idPaciente); }

function apiAddVisita(data) { try { validatePatientSelected(data.idPaciente); validateRequired(data, ['fecha', 'tipoVisita', 'modalidad', 'nivelCMO']); validateDate(data.fecha, 'fecha'); const idVisita = createUniqueId('VIS'); appendCommon('VisitasCMO', 'idVisita', idVisita, Object.assign({}, data, { fecha: toDateOnly(data.fecha) })); updateObjectById('Pacientes', 'idPaciente', data.idPaciente, { fechaUltimaVisita: toDateOnly(data.fecha), nivelCMOActual: data.nivelCMO, updatedAt: toIsoDateTime(new Date()), updatedBy: getCurrentUserEmail() }); return apiResponseOk({ idVisita: idVisita }); } catch (e) { return apiResponseError(e); } }
function apiAddDispensacion(data) { try { validatePatientSelected(data.idPaciente); validateRequired(data, ['fechaPrevista', 'fechaReal']); validateDate(data.fechaPrevista, 'fechaPrevista'); validateDate(data.fechaReal, 'fechaReal'); const retraso = calculateDelayDays(data.fechaPrevista, data.fechaReal); const id = createUniqueId('DSP'); appendCommon('Dispensaciones', 'idDispensacion', id, Object.assign({}, data, { fechaPrevista: toDateOnly(data.fechaPrevista), fechaReal: toDateOnly(data.fechaReal), retrasoDias: retraso })); return apiResponseOk({ idDispensacion: id, retrasoDias: retraso }); } catch (e) { return apiResponseError(e); } }
function apiAddActivacion(data) { try { validatePatientSelected(data.idPaciente); const items = ['enfermedad', 'objetivoTratamiento', 'administracion', 'conservacion', 'olvidos', 'efectosAdversos', 'contacto', 'decisiones']; items.forEach((k) => validateScore0to2(data[k], k)); const puntuacionTotal = items.reduce((s, k) => s + Number(data[k] || 0), 0); const nivelActivacion = puntuacionTotal <= 5 ? 'baja activación' : puntuacionTotal <= 11 ? 'activación intermedia' : 'alta activación'; const id = createUniqueId('ACT'); appendCommon('ActivacionPaciente', 'idRegistro', id, Object.assign({}, data, { fecha: toDateOnly(data.fecha || new Date()), puntuacionTotal: puntuacionTotal, nivelActivacion: nivelActivacion })); return apiResponseOk({ idRegistro: id, puntuacionTotal: puntuacionTotal, nivelActivacion: nivelActivacion }); } catch (e) { return apiResponseError(e); } }
function apiAddAutoadministracion(data) { try { validatePatientSelected(data.idPaciente); validateRequired(data, ['fecha', 'resultadoGlobal']); appendCommon('Autoadministracion', 'idRegistro', createUniqueId('AUT'), Object.assign({}, data, { fecha: toDateOnly(data.fecha) })); return apiResponseOk({}); } catch (e) { return apiResponseError(e); } }
function apiAddRespuesta(data) { try { validatePatientSelected(data.idPaciente); validateRequired(data, ['fecha', 'respuestaGlobal', 'requiereRevisionMedica']); appendCommon('Respuesta', 'idRespuesta', createUniqueId('RSP'), Object.assign({}, data, { fecha: toDateOnly(data.fecha) })); return apiResponseOk({}); } catch (e) { return apiResponseError(e); } }
function apiAddSeguridad(data) { try { validatePatientSelected(data.idPaciente); validateRequired(data, ['fecha', 'tipoEvento', 'gravedad']); appendCommon('Seguridad', 'idEvento', createUniqueId('SEG'), Object.assign({}, data, { fecha: toDateOnly(data.fecha) })); return apiResponseOk({}); } catch (e) { return apiResponseError(e); } }
function apiAddIntervencion(data) { try { validatePatientSelected(data.idPaciente); validateRequired(data, ['fecha', 'dominioCMO', 'tipoIntervencion']); appendCommon('IntervencionesCMO', 'idIntervencion', createUniqueId('INT'), Object.assign({}, data, { fecha: toDateOnly(data.fecha) })); return apiResponseOk({}); } catch (e) { return apiResponseError(e); } }

function appendCommon(sheet, idField, idValue, data) { const now = toIsoDateTime(new Date()); const user = getCurrentUserEmail(); appendObject(sheet, Object.assign({}, data, { [idField]: idValue, createdAt: now, updatedAt: now, createdBy: user, updatedBy: user })); logAudit('CREATE', sheet, idValue, 'Alta de registro'); }
function validateRequired(data, fields) { fields.forEach((f) => { if (data[f] === undefined || data[f] === null || String(data[f]).trim() === '') throw new Error('Campo obligatorio: ' + f); }); }
function validateDate(value, field) { const d = new Date(value); if (isNaN(d.getTime())) throw new Error('Fecha inválida en ' + field); }
function validatePatientSelected(idPaciente) { if (!idPaciente) throw new Error('Debe seleccionar un paciente.'); }
function validateScore0to2(value, field) { const n = Number(value); if (isNaN(n) || n < 0 || n > 2) throw new Error('El campo ' + field + ' debe estar entre 0 y 2.'); }
function calculateDelayDays(fechaPrevista, fechaReal) { return Math.max(0, Math.floor((new Date(fechaReal) - new Date(fechaPrevista)) / 86400000)); }
