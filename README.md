# cmodelta (MVP)

Aplicación web en Google Apps Script + Google Sheets para seguimiento farmacéutico hospitalario de pacientes con hepatitis delta crónica desde la perspectiva CMO.

## Objetivo
cmodelta centraliza el seguimiento farmacéutico (no sustituye historia clínica):
- Estratificación CMO.
- Dispensaciones y retrasos.
- Activación del paciente.
- Competencia de autoadministración.
- Seguridad.
- Respuesta terapéutica (sin recomendaciones automáticas de cambio de tratamiento).
- Intervenciones farmacéuticas.
- Informe farmacéutico imprimible.

## Arquitectura
- **Backend**: Google Apps Script (`Code.gs`, `Database.gs`, `Api.gs`, `Reports.gs`).
- **Base de datos**: Google Sheets (11 hojas gestionadas por `setupDatabase()`).
- **Frontend**: `index.html` con HTML/CSS/JS nativo.
- **Sin dependencias externas**, sin APIs externas, sin servicios de pago.

## Protección de datos
La herramienta está diseñada para trabajar exclusivamente con datos seudonimizados. No introduzca nombres, apellidos, NHC, DNI, teléfono, correo electrónico, dirección ni ningún dato que permita identificar directamente al paciente. La correspondencia entre código local y paciente real debe custodiarse fuera de esta herramienta.

## Puesta en marcha
1. Cree un Google Sheet vacío.
2. Abra **Extensiones → Apps Script**.
3. Cree/pegue los archivos:
   - `Code.gs`
   - `Database.gs`
   - `Api.gs`
   - `Reports.gs`
   - `index.html`
4. Guarde.
5. Ejecute manualmente `setupDatabase()` una vez y otorgue permisos.
6. Verifique que se han creado las hojas:
   - Pacientes, VisitasCMO, Dispensaciones, ActivacionPaciente, Autoadministracion, Respuesta, Seguridad, IntervencionesCMO, Usuarios, AuditLog, Config.

## Despliegue como aplicación web
1. En Apps Script: **Implementar → Nueva implementación**.
2. Tipo: **Aplicación web**.
3. Ejecutar como: su cuenta.
4. Acceso: usuarios autorizados del dominio/entorno que corresponda.
5. Implementar y abrir URL.

## Prueba rápida con paciente ficticio
1. Crear paciente con código seudonimizado (ej. `HDV-001`).
2. Añadir una visita CMO.
3. Añadir una dispensación con `fechaPrevista` y `fechaReal` (ver `retrasoDias`).
4. Añadir activación con 8 ítems (0-2) para calcular `puntuacionTotal` y `nivelActivacion`.
5. Generar informe farmacéutico imprimible.

## Limitaciones del MVP
- No incluye autenticación avanzada por roles más allá de hoja `Usuarios`.
- Validaciones clínicas mínimas (operativas, no de decisión médica).
- No integra historia clínica electrónica.
- Informe imprimible básico en HTML.
- El índice de activación se usa como **índice operativo** de entrevista farmacéutica, no cuestionario validado.

## Versión 1.1 (operativa)
- Flujo obligatorio: crear/seleccionar paciente antes de registrar.
- Formularios clínicos ocultos hasta seleccionar paciente.
- Ficha resumen con tablas por módulo y recarga automática tras guardar.
- Validaciones frontend + backend con respuesta consistente `{ok,data}` / `{ok,error}`.
- Informe farmacéutico construido con datos reales del paciente seleccionado.

