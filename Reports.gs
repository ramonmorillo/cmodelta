function apiBuildReport(idPaciente) {
  const data = apiGetPacienteDashboard(idPaciente);
  const p = data.paciente;
  const lastDisp = data.dispensaciones.slice(0, 3);
  return {
    meta: {
      codigoPaciente: p.codigoPaciente,
      centro: p.centro,
      nivelCMOActual: p.nivelCMOActual,
      tratamientoActivo: p.tratamientoActivo,
      fechaUltimaVisita: p.fechaUltimaVisita
    },
    dispensaciones: lastDisp,
    activacion: data.activacion,
    autoadministracion: data.autoadministracion,
    respuesta: data.respuesta,
    seguridad: data.seguridad,
    intervenciones: data.intervenciones,
    disclaimer: 'Informe farmacéutico de apoyo al seguimiento. No establece cambios terapéuticos automáticos. Ante hallazgos clínicos, requiere revisión clínica/médica.'
  };
}
