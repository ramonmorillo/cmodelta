function buildReportHtml(bundle, recommendation) {
  const p = bundle.patient;
  const disp = bundle.dispensations[0];
  const act = bundle.activations[0];
  const rsp = bundle.responses[0];
  const safe = bundle.safetyEvents[0];
  const intr = bundle.interventions[0];
  return "<div><p><b>Informe farmacéutico CMO</b></p>" +
    "<p>Paciente: " + safeHtml(p.codigoPaciente) + " · Centro: " + safeHtml(p.centro) + " · Estado: " + safeHtml(p.estado) + "</p>" +
    "<p>Nivel CMO actual: " + safeHtml(p.nivelCMOActual) + " · Tratamiento activo: " + safeHtml(p.tratamientoActivo) + "</p>" +
    "<p>Última visita: " + safeHtml(p.fechaUltimaVisita || '-') + "</p>" +
    "<p>Última dispensación: " + safeHtml(disp ? (disp.fechaReal + ' (retraso ' + disp.retrasoDias + ' días)') : 'Sin registros todavía') + "</p>" +
    "<p>Última activación: " + safeHtml(act ? (act.nivelActivacion + ' (' + act.puntuacionTotal + ')') : 'Sin registros todavía') + "</p>" +
    "<p>Última respuesta: " + safeHtml(rsp ? rsp.respuestaGlobal : 'Sin registros todavía') + "</p>" +
    "<p>Último evento de seguridad: " + safeHtml(safe ? (safe.tipoEvento + ' · ' + safe.gravedad) : 'Sin registros todavía') + "</p>" +
    "<p>Última intervención: " + safeHtml(intr ? (intr.dominioCMO + ' · ' + intr.tipoIntervencion) : 'Sin registros todavía') + "</p>" +
    "<p><b>Recomendación farmacéutica:</b> " + safeHtml(recommendation || '') + "</p>" +
    "<p><i>La herramienta no recomienda cambios terapéuticos automáticos. La respuesta debe interpretarse con el equipo médico.</i></p></div>";
}

function safeHtml(value) {
  return String(value || '').replace(/[<>&"']/g, function (c) { return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]; });
}

function apiBuildReport(idPaciente, recommendation) {
  try {
    const res = getPatientBundle(idPaciente);
    if (!res.ok) return res;
    const html = buildReportHtml(res.data, recommendation || '');
    return apiResponseOk({ reportHtml: html });
  } catch (e) { return apiResponseError(e); }
}
