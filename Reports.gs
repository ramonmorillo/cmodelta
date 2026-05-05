function apiBuildReport(idPaciente) {
  try {
    const dashboardRes = apiGetPacienteDashboard(idPaciente);
    if (!dashboardRes.ok) return dashboardRes;
    const data = dashboardRes.data;
    const p = data.paciente;
    return apiResponseOk({
      meta: {
        codigoPaciente: p.codigoPaciente,
        centro: p.centro,
        estado: p.estado,
        tratamientoActivo: p.tratamientoActivo,
        nivelCMOActual: p.nivelCMOActual,
        fechaUltimaVisita: p.fechaUltimaVisita || '-'
      },
      ultimasDispensaciones: (data.dispensaciones || []).slice(0, 3),
      ultimaActivacion: (data.activacion || [])[0] || null,
      ultimaAutoadministracion: (data.autoadministracion || [])[0] || null,
      ultimaRespuesta: (data.respuesta || [])[0] || null,
      eventosSeguridad: (data.seguridad || []).slice(0, 5),
      intervencionesRecientes: (data.intervenciones || []).slice(0, 5),
      disclaimer: 'Informe farmacéutico de apoyo al seguimiento. No sustituye la valoración clínica médica ni recomienda cambios terapéuticos automáticos.'
    });
  } catch (e) {
    return apiResponseError(e);
  }
}
