# cmodelta

Aplicación Google Apps Script + Google Sheets para seguimiento farmacéutico CMO con flujo operativo real:

1. Crear o seleccionar paciente.
2. Cargar ficha completa en la zona derecha.
3. Registrar visitas, dispensaciones, activación, autoadministración, respuesta, seguridad e intervenciones.
4. Ver registros longitudinales por pestañas.
5. Generar informe farmacéutico editable e imprimible.

## Archivos
- `Code.gs`
- `Database.gs`
- `Api.gs`
- `Reports.gs`
- `index.html`

## Configuración
1. Crear una hoja de cálculo vacía.
2. Abrir Apps Script y copiar todos los archivos.
3. Ejecutar `setupDatabase()`.
4. Desplegar como aplicación web.

## Reglas de protección de datos
Uso exclusivo con datos seudonimizados. No introducir nombre, apellidos, NHC, DNI, teléfono, correo, dirección ni identificadores directos.

## Funciones backend principales
- `listPatients()`
- `createPatient(data)`
- `updatePatient(idPaciente, data)`
- `getPatientBundle(idPaciente)`
- `createVisit(data)`
- `createDispensation(data)`
- `createActivation(data)`
- `createSelfAdministration(data)`
- `createResponse(data)`
- `createSafetyEvent(data)`
- `createIntervention(data)`

## Prueba de aceptación rápida
- Abrir app y validar estado inicial en zona derecha (nunca vacía).
- Crear `HDV-TEST-001`.
- Ver selección automática y ficha.
- Registrar visita.
- Registrar dispensación (con retraso calculado).
- Registrar activación (con puntuación y nivel).
- Generar informe real del paciente.
