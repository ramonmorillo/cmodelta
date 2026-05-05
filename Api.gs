function apiGetInitialData() {
  return {
    appTitle: APP_TITLE,
    appSubtitle: APP_SUBTITLE,
    dataWarning: DATA_WARNING,
    pacientes: apiListPacientes()
  };
}

function apiListPacientes(query) {
  const all = getSheetDataObject('Pacientes');
  if (!query) return all;
  return all.filter((p) => String(p.codigoPaciente || '').toLowerCase().includes(String(query).toLowerCase()));
}

function apiSavePaciente(payload) {
  validateRequired(payload, ['codigoPaciente', 'centro', 'fechaAlta', 'estado', 'tratamientoActivo', 'nivelCMOActual']);
  validateDate(payload.fechaAlta, 'fechaAlta');

  const now = toIsoDateTime(new Date());
  const user = getCurrentUserEmail();

  if (!payload.idPaciente) {
    const duplicado = apiListPacientes(payload.codigoPaciente).some((p) => String(p.codigoPaciente).toLowerCase() === String(payload.codigoPaciente).toLowerCase());
    if (duplicado) throw new Error('Ya existe un paciente con ese codigoPaciente.');

    const idPaciente = `PAC-${new Date().getTime()}`;
    appendObject('Pacientes', {
      idPaciente,
      codigoPaciente: payload.codigoPaciente,
      centro: payload.centro,
      fechaAlta: payload.fechaAlta,
      estado: payload.estado,
      tratamientoActivo: payload.tratamientoActivo,
      nivelCMOActual: payload.nivelCMOActual,
      fechaUltimaVisita: payload.fechaUltimaVisita || '',
      observaciones: payload.observaciones || '',
      createdAt: now,
      updatedAt: now,
      createdBy: user,
      updatedBy: user
    });
    logAudit('CREATE', 'Pacientes', idPaciente, `Alta de paciente ${payload.codigoPaciente}`);
    return { ok: true, idPaciente };
  }

  const changes = Object.assign({}, payload, { updatedAt: now, updatedBy: user });
  updateObjectById('Pacientes', 'idPaciente', payload.idPaciente, changes);
  logAudit('UPDATE', 'Pacientes', payload.idPaciente, `Actualización de paciente ${payload.codigoPaciente}`);
  return { ok: true, idPaciente: payload.idPaciente };
}

function apiGetPacienteDashboard(idPaciente) {
  if (!idPaciente) throw new Error('Seleccione un paciente.');
  const paciente = apiListPacientes().find((p) => String(p.idPaciente) === String(idPaciente));
  if (!paciente) throw new Error('Paciente no encontrado.');

  const latest = (sheet, limit) => getSheetDataObject(sheet)
    .filter((r) => String(r.idPaciente) === String(idPaciente))
    .sort((a, b) => String(b.fecha || b.createdAt).localeCompare(String(a.fecha || a.createdAt)))
    .slice(0, limit || 5);

  return {
    paciente,
    visitas: latest('VisitasCMO', 5),
    dispensaciones: latest('Dispensaciones', 5),
    activacion: latest('ActivacionPaciente', 1)[0] || null,
    autoadministracion: latest('Autoadministracion', 1)[0] || null,
    respuesta: latest('Respuesta', 1)[0] || null,
    seguridad: latest('Seguridad', 5),
    intervenciones: latest('IntervencionesCMO', 5)
  };
}

function apiAddVisita(data) {
  validatePatientSelected(data.idPaciente);
  validateRequired(data, ['fecha', 'tipoVisita', 'modalidad', 'nivelCMO']);
  validateDate(data.fecha, 'fecha');

  const idVisita = `VIS-${new Date().getTime()}`;
  const now = toIsoDateTime(new Date());
  const user = getCurrentUserEmail();
  appendObject('VisitasCMO', Object.assign({
    idVisita,
    createdAt: now,
    updatedAt: now,
    createdBy: user,
    updatedBy: user
  }, data));

  updateObjectById('Pacientes', 'idPaciente', data.idPaciente, {
    fechaUltimaVisita: data.fecha,
    nivelCMOActual: data.nivelCMO || '',
    updatedAt: now,
    updatedBy: user
  });
  logAudit('CREATE', 'VisitasCMO', idVisita, `Visita CMO para ${data.idPaciente}`);
  return { ok: true };
}

function apiAddDispensacion(data) {
  validatePatientSelected(data.idPaciente);
  validateRequired(data, ['fechaPrevista', 'fechaReal']);
  validateDate(data.fechaPrevista, 'fechaPrevista');
  validateDate(data.fechaReal, 'fechaReal');

  const retraso = calculateDelayDays(data.fechaPrevista, data.fechaReal);
  const id = `DSP-${new Date().getTime()}`;
  appendCommon('Dispensaciones', 'idDispensacion', id, Object.assign({}, data, { retrasoDias: retraso }));
  logAudit('CREATE', 'Dispensaciones', id, `Dispensación para ${data.idPaciente}`);
  return { ok: true, retrasoDias: retraso };
}

function apiAddActivacion(data) {
  validatePatientSelected(data.idPaciente);
  const items = ['enfermedad', 'objetivoTratamiento', 'administracion', 'conservacion', 'olvidos', 'efectosAdversos', 'contacto', 'decisiones'];
  items.forEach((k) => validateScore0to2(data[k], k));
  const puntuacionTotal = items.reduce((sum, k) => sum + Number(data[k] || 0), 0);
  const nivelActivacion = puntuacionTotal <= 5 ? 'baja activación' : puntuacionTotal <= 11 ? 'activación intermedia' : 'alta activación';
  const id = `ACT-${new Date().getTime()}`;
  appendCommon('ActivacionPaciente', 'idRegistro', id, Object.assign({}, data, { puntuacionTotal, nivelActivacion }));
  logAudit('CREATE', 'ActivacionPaciente', id, `Activación para ${data.idPaciente}`);
  return { ok: true, puntuacionTotal, nivelActivacion };
}

function apiAddAutoadministracion(data) { validatePatientSelected(data.idPaciente); const id = `AUT-${new Date().getTime()}`; appendCommon('Autoadministracion', 'idRegistro', id, data); logAudit('CREATE', 'Autoadministracion', id, `Autoadministración para ${data.idPaciente}`); return { ok: true }; }
function apiAddRespuesta(data) { validatePatientSelected(data.idPaciente); const id = `RSP-${new Date().getTime()}`; appendCommon('Respuesta', 'idRespuesta', id, data); logAudit('CREATE', 'Respuesta', id, `Respuesta para ${data.idPaciente}`); return { ok: true }; }
function apiAddSeguridad(data) { validatePatientSelected(data.idPaciente); const id = `SEG-${new Date().getTime()}`; appendCommon('Seguridad', 'idEvento', id, data); logAudit('CREATE', 'Seguridad', id, `Evento seguridad para ${data.idPaciente}`); return { ok: true }; }
function apiAddIntervencion(data) { validatePatientSelected(data.idPaciente); const id = `INT-${new Date().getTime()}`; appendCommon('IntervencionesCMO', 'idIntervencion', id, data); logAudit('CREATE', 'IntervencionesCMO', id, `Intervención para ${data.idPaciente}`); return { ok: true }; }

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

function validateRequired(data, fields) {
  fields.forEach((f) => {
    if (data[f] === undefined || data[f] === null || String(data[f]).trim() === '') {
      throw new Error(`Campo obligatorio: ${f}`);
    }
  });
}
function validateDate(value, field) {
  const d = new Date(value);
  if (!(d instanceof Date) || isNaN(d.getTime())) throw new Error(`Fecha inválida en ${field}`);
}
function validatePatientSelected(idPaciente) { if (!idPaciente) throw new Error('Debe seleccionar un paciente.'); }
function validateScore0to2(value, field) { const n = Number(value); if (isNaN(n) || n < 0 || n > 2) throw new Error(`El campo ${field} debe estar entre 0 y 2.`); }
function calculateDelayDays(fechaPrevista, fechaReal) { const d1 = new Date(fechaPrevista); const d2 = new Date(fechaReal); const diff = Math.floor((d2 - d1) / (1000 * 60 * 60 * 24)); return diff > 0 ? diff : 0; }
