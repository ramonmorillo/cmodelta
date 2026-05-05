function buildReportHtml(bundle, recommendation) {
  const p = bundle.patient || {};
  const v = bundle.visits[0];
  const d = bundle.dispensations[0];
  const a = bundle.activations[0];
  const sa = bundle.selfAdministration[0];
  const r = bundle.responses[0];
  const s = bundle.safetyEvents[0];
  const i = bundle.interventions || [];
  const hasLong = v || d || a || sa || r || s || i.length;
  const resumen = hasLong
    ? 'El paciente se encuentra en seguimiento farmacéutico CMO con nivel de prioridad ' + safeHtml(p.nivelCMOActual || 'no definido') +
      '. La última dispensación registrada fue el día ' + safeHtml(d ? d.fechaReal : 'sin dato') +
      ', con un retraso de ' + safeHtml(d ? d.retrasoDias : 'sin dato') + ' días. La activación del paciente es ' + safeHtml(a ? a.nivelActivacion : 'sin dato') +
      '. La última respuesta registrada se clasifica como ' + safeHtml(r ? r.respuestaGlobal : 'sin dato') +
      '. Se han registrado ' + i.length + ' intervenciones farmacéuticas.'
    : 'No hay datos suficientes para elaborar una valoración longitudinal completa.';

  return "<div class='print-report'>" +
    "<h2>Informe farmacéutico CMO-HDV</h2><p class='sub'>Seguimiento farmacéutico centrado en resultados en salud en hepatitis delta</p>" +
    block('Datos seudonimizados', [
      ['Código paciente', p.codigoPaciente], ['Centro', p.centro], ['Estado', p.estado], ['Tratamiento activo', p.tratamientoActivo],
      ['Nivel CMO actual', p.nivelCMOActual], ['Fecha de alta', p.fechaAlta], ['Fecha última visita', p.fechaUltimaVisita || 'Sin registros todavía']
    ]) +
    "<div class='rblock'><h3>Resumen ejecutivo</h3><p>" + resumen + "</p></div>" +
    block('Bloque CMO', [['Nivel actual', p.nivelCMOActual], ['Última visita CMO', v ? v.fecha : 'Sin registros todavía'], ['Plan de seguimiento', v ? (v.planSeguimiento || '-') : 'Sin registros todavía'], ['Necesidades detectadas', v ? (v.motivo || '-') : 'Sin registros todavía']]) +
    block('Dispensación/adherencia', [['Última dispensación', d ? d.fechaReal : 'Sin registros todavía'], ['Retraso', d ? d.retrasoDias + ' días' : 'Sin registros todavía'], ['Días cubiertos', d ? d.diasCubiertos : 'Sin registros todavía'], ['Incidencias', d ? d.incidencia : 'Sin registros todavía'], ['Próxima dispensación', d ? d.proximaDispensacion : 'Sin registros todavía']]) +
    block('Activación', [['Puntuación', a ? a.puntuacionTotal : 'Sin registros todavía'], ['Nivel', a ? a.nivelActivacion : 'Sin registros todavía'], ['Interpretación breve', a ? ('Índice ' + a.nivelActivacion) : 'Sin registros todavía'], ['Nota', 'Índice operativo de apoyo a la entrevista farmacéutica. No es un cuestionario validado.']]) +
    block('Autoadministración', [['Resultado global', sa ? sa.resultadoGlobal : 'Sin registros todavía'], ['Confianza', sa ? sa.confianzaPaciente : 'Sin registros todavía'], ['Necesidad de reeducación', sa ? sa.necesitaReeducacion : 'Sin registros todavía']]) +
    block('Respuesta', [['ARN-VHD', r ? r.arnVhd : 'Sin registros todavía'], ['ALT', r ? r.alt : 'Sin registros todavía'], ['Respuesta global', r ? r.respuestaGlobal : 'Sin registros todavía'], ['Requiere revisión médica', r ? r.requiereRevisionMedica : 'Sin registros todavía']]) +
    block('Seguridad', [['Último evento', s ? s.tipoEvento : 'Sin registros todavía'], ['Gravedad', s ? s.gravedad : 'Sin registros todavía'], ['Acción', s ? s.accionRealizada : 'Sin registros todavía'], ['Resuelto', s ? s.resuelto : 'Sin registros todavía'], ['Comunicado a hepatología', s ? s.comunicadoHepatologia : 'Sin registros todavía']]) +
    "<div class='rblock'><h3>Intervenciones</h3><p>Número de intervenciones: " + i.length + "</p>" +
    (i.length ? "<ul>" + i.slice(0, 3).map((x) => '<li>' + safeHtml(x.fecha) + ' · ' + safeHtml(x.dominioCMO) + ' · ' + safeHtml(x.resultado || '-') + '</li>').join('') + "</ul>" : '<p>Sin registros todavía</p>') + "</div>" +
    "<div class='rblock'><h3>Recomendación farmacéutica</h3><p>" + safeHtml(recommendation || 'Sin recomendación añadida') + "</p></div>" +
    "<p class='note'>Este informe farmacéutico es un documento de apoyo al seguimiento y no sustituye la valoración clínica médica ni recomienda cambios terapéuticos automáticos.</p>" +
    "</div>";
}
function block(title, pairs) { return "<div class='rblock'><h3>" + safeHtml(title) + "</h3>" + pairs.map(function (p) { return "<div><b>" + safeHtml(p[0]) + ":</b> " + safeHtml(p[1] || '') + "</div>"; }).join('') + "</div>"; }
function safeHtml(value) { return String(value || '').replace(/[<>&"']/g, function (c) { return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function apiBuildReport(idPaciente, recommendation) { try { const res = getPatientBundle(idPaciente); if (!res.ok) return res; return apiResponseOk({ reportHtml: buildReportHtml(res.data, recommendation || '') }); } catch (e) { return apiResponseError(e); } }
