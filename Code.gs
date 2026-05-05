const APP_TITLE = 'cmodelta';
const APP_SUBTITLE = 'Seguimiento farmacéutico CMO en hepatitis delta';
const DATA_WARNING = 'La herramienta está diseñada para trabajar exclusivamente con datos seudonimizados. No introduzca nombres, apellidos, NHC, DNI, teléfono, correo electrónico, dirección ni ningún dato que permita identificar directamente al paciente. La correspondencia entre código local y paciente real debe custodiarse fuera de esta herramienta.';

function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle(APP_TITLE)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
