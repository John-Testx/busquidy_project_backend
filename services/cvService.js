const fs = require("fs");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const {
  extraerNombre,
  dividirNombreCompleto,
  extraerIdentificacion,
  extraerFechaNacimiento,
  extraerNacionalidad,
  extraerDireccion,
  extraerRegion,
  extraerComuna,
  extraerCiudad,
  extraerCorreo,
  extraerTelefono,
  extraerRenta,
  extraerDisponibilidad,
  extraerDescripcion,
  extraerDato
} = require("./cv/extractors");
const { limpiarTextoParaDB } = require("./cv/formatters");

/**
 * Procesar archivo CV (PDF o Word)
 */
async function procesarArchivoCV(file) {
  let extractedText = "";

  if (file.mimetype === "application/pdf") {
    const dataBuffer = fs.readFileSync(file.path);
    const pdfData = await pdfParse(dataBuffer);
    extractedText = pdfData.text;
  } else if (
    file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.mimetype === "application/msword"
  ) {
    const dataBuffer = fs.readFileSync(file.path);
    const docData = await mammoth.extractRawText({ buffer: dataBuffer });
    extractedText = docData.value;
  } else {
    throw new Error("Formato de archivo no soportado.");
  }

  return extractedText;
}

/**
 * Procesar texto extraído del CV
 */
async function procesarCV(texto) {
  // Extraer datos personales
  const nombreCompleto = extraerNombre(texto);
  const { nombres, apellidos } = dividirNombreCompleto(nombreCompleto);
  const identificacion = extraerIdentificacion(texto) || null;
  const linkedIn = extraerDato(texto, /Linkedin:\s*(https?:\/\/[^\s]+)/i) || null;
  const telefono = extraerTelefono(texto) || null;
  const estado_civil = extraerDato(texto, /Estado Civil\s+(.+)/i) || null;
  const nacionalidad = extraerNacionalidad(texto) || null;
  const fecha_nacimiento = extraerFechaNacimiento(texto) || null;
  
  // Extraer ubicación
  const region = extraerRegion(texto) || null;
  const ciudad = extraerCiudad(texto) || null;
  const comuna = extraerComuna(texto) || null;
  const direccion = extraerDireccion(texto) || null;
  
  // Extraer información laboral
  const disponibilidad = extraerDisponibilidad(texto) || null;
  const renta_esperada = extraerRenta(texto) || null;
  const correo = extraerCorreo(texto) || null;
  
  // Extraer descripción
  const descripcionExtraida = extraerDescripcion(texto) || null;
  const descripcion = limpiarTextoParaDB(descripcionExtraida);

  // Crear el objeto de datos extraídos
  const perfilData = {
    freelancer: { 
      correo_contacto: correo, 
      telefono_contacto: telefono, 
      linkedin_link: linkedIn, 
      descripcion_freelancer: descripcion 
    },
    antecedentes_personales: {
      nombres,
      apellidos,
      fecha_nacimiento,
      identificacion,
      nacionalidad,
      direccion,
      region,
      ciudad_freelancer: ciudad,
      comuna,
      estado_civil
    },
    pretensiones: { 
      disponibilidad, 
      renta_esperada 
    }
  };

  console.log("Datos extraídos del CV:", perfilData);
  return perfilData;
}

module.exports = {
  procesarArchivoCV,
  procesarCV
};