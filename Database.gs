const TABLE_SCHEMAS = {
  Pacientes: ['idPaciente', 'codigoPaciente', 'centro', 'fechaAlta', 'estado', 'tratamientoActivo', 'nivelCMOActual', 'fechaUltimaVisita', 'observaciones', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy'],
  VisitasCMO: ['idVisita', 'idPaciente', 'fecha', 'tipoVisita', 'modalidad', 'motivo', 'nivelCMO', 'planSeguimiento', 'proximaRevision', 'observaciones', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy'],
  Dispensaciones: ['idDispensacion', 'idPaciente', 'fechaPrevista', 'fechaReal', 'diasCubiertos', 'retrasoDias', 'incidencia', 'intervencion', 'proximaDispensacion', 'observaciones', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy'],
  ActivacionPaciente: ['idRegistro', 'idPaciente', 'idVisita', 'fecha', 'enfermedad', 'objetivoTratamiento', 'administracion', 'conservacion', 'olvidos', 'efectosAdversos', 'contacto', 'decisiones', 'puntuacionTotal', 'nivelActivacion', 'observaciones', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy'],
  Autoadministracion: ['idRegistro', 'idPaciente', 'idVisita', 'fecha', 'conservacionCorrecta', 'preparacionCorrecta', 'administracionCorrecta', 'rotacionZonas', 'manejoOlvidos', 'manejoResiduos', 'confianzaPaciente', 'necesitaReeducacion', 'resultadoGlobal', 'observaciones', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy'],
  Respuesta: ['idRespuesta', 'idPaciente', 'fecha', 'mesTratamiento', 'arnVhd', 'alt', 'respuestaVirologica', 'respuestaBioquimica', 'respuestaGlobal', 'requiereRevisionMedica', 'comentario', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy'],
  Seguridad: ['idEvento', 'idPaciente', 'idVisita', 'fecha', 'tipoEvento', 'gravedad', 'relacionTratamiento', 'accionRealizada', 'resuelto', 'comunicadoHepatologia', 'observaciones', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy'],
  IntervencionesCMO: ['idIntervencion', 'idPaciente', 'idVisita', 'fecha', 'dominioCMO', 'tipoIntervencion', 'descripcion', 'resultado', 'aceptada', 'seguimiento', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy'],
  Usuarios: ['email', 'nombre', 'rol', 'centro', 'activo', 'createdAt', 'updatedAt'],
  AuditLog: ['timestamp', 'usuario', 'accion', 'tabla', 'idRegistro', 'detalle'],
  Config: ['clave', 'valor']
};

function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(TABLE_SCHEMAS).forEach((sheetName) => {
    const sheet = ensureSheet(ss, sheetName, TABLE_SCHEMAS[sheetName]);
    styleHeader(sheet, TABLE_SCHEMAS[sheetName].length);
  });

  seedConfig(ss);
  seedAdminUser(ss);
  logAudit('SETUP_DATABASE', 'Config', 'N/A', 'Inicialización de base de datos');
  return { ok: true, message: 'Base de datos preparada correctamente.' };
}

function ensureSheet(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);

  const maxRows = sheet.getMaxRows();
  const maxCols = Math.max(sheet.getMaxColumns(), headers.length);

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    const currentHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    const needsHeaders = headers.some((h, i) => currentHeaders[i] !== h);
    if (needsHeaders) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  if (maxCols < headers.length) {
    sheet.insertColumnsAfter(maxCols, headers.length - maxCols);
  }
  if (maxRows < 2) sheet.insertRowsAfter(maxRows, 10);
  return sheet;
}

function styleHeader(sheet, colCount) {
  const range = sheet.getRange(1, 1, 1, colCount);
  range.setFontWeight('bold').setBackground('#d9e4f5').setFontColor('#1f2937');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, colCount);
}

function seedConfig(ss) {
  const sheet = ss.getSheetByName('Config');
  if (sheet.getLastRow() <= 1) {
    const values = [
      ['appTitle', APP_TITLE],
      ['appSubtitle', APP_SUBTITLE],
      ['dataWarning', DATA_WARNING],
      ['activacionNota', 'Índice operativo de apoyo a la entrevista farmacéutica. No es un cuestionario validado.']
    ];
    sheet.getRange(2, 1, values.length, 2).setValues(values);
  }
}

function seedAdminUser(ss) {
  const sheet = ss.getSheetByName('Usuarios');
  if (sheet.getLastRow() <= 1) {
    const now = toIsoDateTime(new Date());
    const email = getCurrentUserEmail();
    sheet.getRange(2, 1, 1, 7).setValues([[email || 'sin-email@local', 'Administrador Inicial', 'admin', '', true, now, now]]);
  }
}

function getSheetDataObject(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) throw new Error(`No existe la hoja ${sheetName}`);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).filter(r => r.join('') !== '').map((row) => rowToObject(headers, row));
}

function appendObject(sheetName, dataObj) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const headers = TABLE_SCHEMAS[sheetName];
  const row = headers.map((h) => dataObj[h] !== undefined ? dataObj[h] : '');
  sheet.appendRow(row);
}

function updateObjectById(sheetName, idField, idValue, changes) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idIndex = headers.indexOf(idField);
  if (idIndex === -1) throw new Error(`Campo ID no encontrado: ${idField}`);

  for (let r = 1; r < values.length; r++) {
    if (String(values[r][idIndex]) === String(idValue)) {
      headers.forEach((h, c) => {
        if (changes[h] !== undefined) values[r][c] = changes[h];
      });
      sheet.getRange(r + 1, 1, 1, headers.length).setValues([values[r]]);
      return true;
    }
  }
  return false;
}

function rowToObject(headers, row) {
  const obj = {};
  headers.forEach((h, i) => { obj[h] = row[i]; });
  return obj;
}

function toIsoDateTime(date) {
  return Utilities.formatDate(new Date(date), Session.getScriptTimeZone() || 'Etc/UTC', "yyyy-MM-dd'T'HH:mm:ss");
}

function toDateOnly(date) {
  return Utilities.formatDate(new Date(date), Session.getScriptTimeZone() || 'Etc/UTC', 'yyyy-MM-dd');
}

function getCurrentUserEmail() {
  try {
    return Session.getActiveUser().getEmail() || 'usuario-no-disponible';
  } catch (e) {
    return 'usuario-no-disponible';
  }
}

function logAudit(action, table, recordId, detail) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('AuditLog');
  if (!sheet) return;
  sheet.appendRow([
    toIsoDateTime(new Date()),
    getCurrentUserEmail(),
    action,
    table,
    recordId,
    detail || ''
  ]);
}

function createUniqueId(prefix) {
  return prefix + '-' + Utilities.getUuid().slice(0, 8) + '-' + new Date().getTime();
}
