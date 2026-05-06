function apiResponseOk(data, message) { return { ok: true, data: data, message: message || '' }; }
function apiResponseError(error, code, details) { return { ok: false, error: { code: code || 'ERR_GENERIC', message: error && error.message ? error.message : String(error), details: details || '' } }; }
function apiLog(label, data) { console.log('[cmodelta] ' + label + ' :: ' + JSON.stringify(data || {})); }

function toText(v) { return String(v || '').trim(); }
function toPatientDto(row) {
  return {
    idPaciente: toText(row.idPaciente),
    codigoPaciente: toText(row.codigoPaciente),
    centro: toText(row.centro),
    fechaAlta: toText(row.fechaAlta),
    estado: toText(row.estado),
    tratamientoActivo: toText(row.tratamientoActivo),
    nivelCMOActual: toText(row.nivelCMOActual),
    fechaUltimaVisita: toText(row.fechaUltimaVisita),
    observaciones: toText(row.observaciones)
  };
}

function listPatients(query) {
  try {
    apiLog('apiListPacientes.call', { query: toText(query) });
    const all = getSheetDataObject('Pacientes').map(toPatientDto);
    const q = toText(query).toLowerCase();
    const filtered = !q ? all : all.filter((p) => p.codigoPaciente.toLowerCase().includes(q));
    filtered.sort((a, b) => a.codigoPaciente.localeCompare(b.codigoPaciente));
    const res = apiResponseOk(filtered);
    apiLog('apiListPacientes.ok', { count: filtered.length });
    return res;
  } catch (e) { apiLog('apiListPacientes.error', { message: e.message }); return apiResponseError(e, 'ERR_LIST_PATIENTS'); }
}

function apiListPacientes(query) { return listPatients(query); }

function createPatient(data) {
  try {
    apiLog('apiSavePaciente.create.call', { hasCodigo: !!toText(data && data.codigoPaciente), centro: toText(data && data.centro), estado: toText(data && data.estado) });
    validateRequired(data, ['codigoPaciente', 'centro', 'estado', 'tratamientoActivo', 'nivelCMOActual']);
    if (toText(data.fechaAlta)) validateDate(data.fechaAlta, 'fechaAlta');
    const normalizedCode = toText(data.codigoPaciente).toUpperCase();
    const duplicate = getSheetDataObject('Pacientes').find((p) => toText(p.codigoPaciente).toUpperCase() === normalizedCode);
    if (duplicate) throw new Error('Ya existe un paciente con ese codigoPaciente.');

    const now = toIsoDateTime(new Date());
    const user = getCurrentUserEmail();
    const createdPatient = {
      idPaciente: createUniqueId('PAC'),
      codigoPaciente: normalizedCode,
      centro: toText(data.centro),
      fechaAlta: toText(data.fechaAlta) ? toDateOnly(data.fechaAlta) : '',
      estado: toText(data.estado),
      tratamientoActivo: toText(data.tratamientoActivo),
      nivelCMOActual: toText(data.nivelCMOActual),
      fechaUltimaVisita: '',
      observaciones: toText(data.observaciones)
    };
    appendObject('Pacientes', Object.assign({}, createdPatient, { createdAt: now, updatedAt: now, createdBy: user, updatedBy: user }));
    logAudit('CREATE', 'Pacientes', createdPatient.idPaciente, 'Alta paciente ' + normalizedCode);
    apiLog('apiSavePaciente.create.ok', { idPaciente: createdPatient.idPaciente, operation: 'create' });
    return apiResponseOk(createdPatient, 'Paciente creado correctamente.');
  } catch (e) { apiLog('apiSavePaciente.create.error', { message: e.message }); return apiResponseError(e, 'ERR_CREATE_PATIENT'); }
}

function updatePatient(idPaciente, data) {
  try {
    apiLog('apiSavePaciente.update.call', { idPaciente: toText(idPaciente), codigoPaciente: toText(data && data.codigoPaciente) });
    validatePatientSelected(idPaciente);
    validateRequired(data, ['codigoPaciente', 'centro', 'estado', 'tratamientoActivo', 'nivelCMOActual']);
    if (toText(data.fechaAlta)) validateDate(data.fechaAlta, 'fechaAlta');
    const normalizedCode = toText(data.codigoPaciente).toUpperCase();
    const duplicate = getSheetDataObject('Pacientes').find((p) => toText(p.codigoPaciente).toUpperCase() === normalizedCode && String(p.idPaciente) !== String(idPaciente));
    if (duplicate) throw new Error('Ya existe un paciente con ese codigoPaciente.');
    const changes = {
      codigoPaciente: normalizedCode,
      centro: toText(data.centro),
      fechaAlta: toText(data.fechaAlta) ? toDateOnly(data.fechaAlta) : '',
      estado: toText(data.estado),
      tratamientoActivo: toText(data.tratamientoActivo),
      nivelCMOActual: toText(data.nivelCMOActual),
      observaciones: toText(data.observaciones),
      updatedAt: toIsoDateTime(new Date()),
      updatedBy: getCurrentUserEmail()
    };
    if (!updateObjectById('Pacientes', 'idPaciente', idPaciente, changes)) throw new Error('Paciente no encontrado.');
    logAudit('UPDATE', 'Pacientes', idPaciente, 'Actualización paciente ' + normalizedCode);
    apiLog('apiSavePaciente.update.ok', { idPaciente: toText(idPaciente), operation: 'update' });
    return apiResponseOk(getSheetDataObject('Pacientes').find((p) => String(p.idPaciente) === String(idPaciente)), 'Paciente actualizado correctamente.');
  } catch (e) { apiLog('apiSavePaciente.update.error', { idPaciente: toText(idPaciente), message: e.message }); return apiResponseError(e, 'ERR_UPDATE_PATIENT'); }
}

function apiSavePaciente(payload) {
  try {
    if (!payload || typeof payload !== 'object') throw new Error('Payload inválido para guardar paciente.');
    const idPaciente = toText(payload.idPaciente);
    return idPaciente ? updatePatient(idPaciente, payload) : createPatient(payload);
  } catch (e) {
    return apiResponseError(e, 'ERR_SAVE_PATIENT');
  }
}

function apiDeactivatePaciente(idPaciente) {
  try {
    validatePatientSelected(idPaciente);
    const changes = { estado: 'Suspendido', updatedAt: toIsoDateTime(new Date()), updatedBy: getCurrentUserEmail() };
    if (!updateObjectById('Pacientes', 'idPaciente', idPaciente, changes)) throw new Error('Paciente no encontrado.');
    const updated = getSheetDataObject('Pacientes').find((p) => String(p.idPaciente) === String(idPaciente));
    logAudit('DEACTIVATE', 'Pacientes', idPaciente, 'Desactivación lógica de paciente');
    apiLog('apiDeactivatePaciente.ok', { idPaciente: toText(idPaciente), operation: 'delete-logical' });
    return apiResponseOk(updated, 'Paciente desactivado correctamente');
  } catch (e) {
    apiLog('apiDeactivatePaciente.error', { idPaciente: toText(idPaciente), message: e.message });
    return apiResponseError(e, 'ERR_DEACTIVATE_PATIENT');
  }
}

function getPatientBundle(idPaciente) {
  try {
    validatePatientSelected(idPaciente);
    const patientRaw = getSheetDataObject('Pacientes').find((p) => String(p.idPaciente) === String(idPaciente));
    if (!patientRaw) throw new Error('Paciente no encontrado.');
    const byPatient = function (sheetName) { return getSheetDataObject(sheetName).filter((r) => String(r.idPaciente) === String(idPaciente)); };
    const sortDesc = function (arr, field) { return arr.sort((a, b) => String(b[field] || '').localeCompare(String(a[field] || ''))); };
    const bundle = {
      patient: toPatientDto(patientRaw),
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
  } catch (e) { return apiResponseError(e, 'ERR_LIST_PATIENTS'); }
}

function createVisit(data) { return apiAddVisita(data); }
function createDispensation(data) { return apiAddDispensacion(data); }
function createActivation(data) { return apiAddActivacion(data); }
function createSelfAdministration(data) { return apiAddAutoadministracion(data); }
function createResponse(data) { return apiAddRespuesta(data); }
function createSafetyEvent(data) { return apiAddSeguridad(data); }
function createIntervention(data) { return apiAddIntervencion(data); }

function apiGetInitialData() {
  try { return apiResponseOk({ appTitle: APP_TITLE, appSubtitle: APP_SUBTITLE, dataWarning: DATA_WARNING, pacientes: listPatients('').data }); }
  catch (e) { return apiResponseError(e); }
}

function apiAddVisita(data) { try { validatePatientSelected(data.idPaciente); validateRequired(data, ['idPaciente', 'fecha', 'tipoVisita', 'modalidad', 'nivelCMO']); validateDate(data.fecha, 'fecha'); const idVisita = createUniqueId('VIS'); const rec = appendCommon('VisitasCMO', 'idVisita', idVisita, Object.assign({}, data, { fecha: toDateOnly(data.fecha), proximaRevision: data.proximaRevision ? toDateOnly(data.proximaRevision) : '' })); updateObjectById('Pacientes', 'idPaciente', data.idPaciente, { fechaUltimaVisita: rec.fecha, nivelCMOActual: rec.nivelCMO, updatedAt: toIsoDateTime(new Date()), updatedBy: getCurrentUserEmail() }); return apiResponseOk(rec);} catch (e){return apiResponseError(e);} }
function apiAddDispensacion(data){ try{ validatePatientSelected(data.idPaciente); validateRequired(data,['idPaciente','fechaPrevista','fechaReal']); validateDate(data.fechaPrevista,'fechaPrevista'); validateDate(data.fechaReal,'fechaReal'); const rec=appendCommon('Dispensaciones','idDispensacion',createUniqueId('DSP'),Object.assign({},data,{fechaPrevista:toDateOnly(data.fechaPrevista),fechaReal:toDateOnly(data.fechaReal),proximaDispensacion:data.proximaDispensacion?toDateOnly(data.proximaDispensacion):'',retrasoDias:calculateDelayDays(data.fechaPrevista,data.fechaReal)})); return apiResponseOk(rec);}catch(e){return apiResponseError(e);} }
function apiAddActivacion(data){ try{ validatePatientSelected(data.idPaciente); validateRequired(data,['idPaciente','fecha']); const items=['enfermedad','objetivoTratamiento','administracion','conservacion','olvidos','efectosAdversos','contacto','decisiones']; items.forEach((k)=>validateScore0to2(data[k],k)); const puntuacionTotal=items.reduce((s,k)=>s+Number(data[k]||0),0); const nivelActivacion=puntuacionTotal<=5?'baja activación':puntuacionTotal<=11?'activación intermedia':'alta activación'; const rec=appendCommon('ActivacionPaciente','idRegistro',createUniqueId('ACT'),Object.assign({},data,{fecha:toDateOnly(data.fecha),puntuacionTotal:puntuacionTotal,nivelActivacion:nivelActivacion})); return apiResponseOk(rec);}catch(e){return apiResponseError(e);} }
function apiAddAutoadministracion(data){ try{ validatePatientSelected(data.idPaciente); validateRequired(data,['idPaciente','fecha','resultadoGlobal']); const rec=appendCommon('Autoadministracion','idRegistro',createUniqueId('AUT'),Object.assign({},data,{fecha:toDateOnly(data.fecha)})); return apiResponseOk(rec);}catch(e){return apiResponseError(e);} }
function apiAddRespuesta(data){ try{ validatePatientSelected(data.idPaciente); validateRequired(data,['idPaciente','fecha','respuestaGlobal','requiereRevisionMedica']); const rec=appendCommon('Respuesta','idRespuesta',createUniqueId('RSP'),Object.assign({},data,{fecha:toDateOnly(data.fecha)})); return apiResponseOk(rec);}catch(e){return apiResponseError(e);} }
function apiAddSeguridad(data){ try{ validatePatientSelected(data.idPaciente); validateRequired(data,['idPaciente','fecha','tipoEvento','gravedad']); const rec=appendCommon('Seguridad','idEvento',createUniqueId('SEG'),Object.assign({},data,{fecha:toDateOnly(data.fecha)})); return apiResponseOk(rec);}catch(e){return apiResponseError(e);} }
function apiAddIntervencion(data){ try{ validatePatientSelected(data.idPaciente); validateRequired(data,['idPaciente','fecha','dominioCMO','tipoIntervencion']); const rec=appendCommon('IntervencionesCMO','idIntervencion',createUniqueId('INT'),Object.assign({},data,{fecha:toDateOnly(data.fecha)})); return apiResponseOk(rec);}catch(e){return apiResponseError(e);} }

function appendCommon(sheet, idField, idValue, data) { const now = toIsoDateTime(new Date()); const user = getCurrentUserEmail(); const record=Object.assign({}, data, { [idField]: idValue, createdAt: now, updatedAt: now, createdBy: user, updatedBy: user }); appendObject(sheet, record); logAudit('CREATE', sheet, idValue, 'Alta de registro'); return record; }
function validateRequired(data, fields) { fields.forEach((f) => { if (data[f] === undefined || data[f] === null || String(data[f]).trim() === '') throw new Error('Campo obligatorio: ' + f); }); }
function validateDate(value, field) { const d = new Date(value); if (isNaN(d.getTime())) throw new Error('Fecha inválida en ' + field); }
function validatePatientSelected(idPaciente) { if (!idPaciente || String(idPaciente).trim() === '') throw new Error('Debe seleccionar un paciente.'); }
function validateScore0to2(value, field) { const n = Number(value); if (isNaN(n) || n < 0 || n > 2) throw new Error('El campo ' + field + ' debe estar entre 0 y 2.'); }
function calculateDelayDays(fechaPrevista, fechaReal) { return Math.max(0, Math.floor((new Date(fechaReal) - new Date(fechaPrevista)) / 86400000)); }

function getDashboardGlobal() {
  try {
    const patients = getSheetDataObject('Pacientes').map(toPatientDto);
    const visits = getSheetDataObject('VisitasCMO');
    const byPatientVisits = {};
    visits.forEach(function (v) { const id = toText(v.idPaciente); if (!id) return; if (!byPatientVisits[id]) byPatientVisits[id] = []; byPatientVisits[id].push(v); });

    const counts = { total: patients.length, activos: 0, inactivos: 0, tratamientoActivo: 0, sinVisitas: 0, conUltimaVisita: 0, pendientesSeguimiento: 0 };
    const levels = { n1: 0, n2: 0, n3: 0, sinNivel: 0 };

    const rows = patients.map(function (p) {
      const estado = toText(p.estado).toLowerCase();
      const tr = toText(p.tratamientoActivo).toLowerCase();
      const nivel = toText(p.nivelCMOActual);
      const hasVisit = !!toText(p.fechaUltimaVisita);
      const pVisits = byPatientVisits[toText(p.idPaciente)] || [];
      const pending = pVisits.some(function (x) { return toText(x.proximaRevision) && toText(x.proximaRevision) <= toDateOnly(new Date()); });

      if (estado === 'activo') counts.activos += 1; else counts.inactivos += 1;
      if (tr === 'sí' || tr === 'si') counts.tratamientoActivo += 1;
      if (hasVisit) counts.conUltimaVisita += 1; else counts.sinVisitas += 1;
      if (pending) counts.pendientesSeguimiento += 1;

      if (nivel === 'Nivel 1') levels.n1 += 1;
      else if (nivel === 'Nivel 2') levels.n2 += 1;
      else if (nivel === 'Nivel 3') levels.n3 += 1;
      else levels.sinNivel += 1;

      return {
        codigoPaciente: p.codigoPaciente,
        centro: p.centro,
        estado: p.estado,
        tratamientoActivo: p.tratamientoActivo,
        nivelCMOActual: p.nivelCMOActual,
        fechaUltimaVisita: p.fechaUltimaVisita,
        resumen: hasVisit ? 'Seguimiento en curso' : 'Sin visitas registradas todavía'
      };
    });

    return apiResponseOk({ counts: counts, levels: levels, patients: rows }, 'Dashboard global calculado correctamente');
  } catch (e) {
    return apiResponseError(e, 'ERR_DASHBOARD_GLOBAL');
  }
}
