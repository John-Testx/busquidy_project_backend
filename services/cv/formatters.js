/**
 * Funciones de formateo y limpieza de datos
 */

/**
 * Limpiar texto para guardar en base de datos
 */
function limpiarTextoParaDB(texto) {
  if (!texto) return null;

  return texto
    .replace(/[•·]/g, "-")
    .replace(/[\u2022\u2023\u25E6\u2043\u2219]/g, "-")
    .replace(/\r\n/g, "\n")
    .replace(/[\x00-\x1F\x7F-\x9F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Validar RUT chileno
 */
function validarRut(rut) {
  rut = rut.replace(/[.-]/g, "").toUpperCase();

  const cuerpo = rut.slice(0, -1);
  const digitoVerificador = rut.slice(-1);

  let suma = 0;
  let multiplo = 2;

  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo.charAt(i)) * multiplo;
    multiplo = multiplo === 7 ? 2 : multiplo + 1;
  }

  const resto = suma % 11;
  let dvCalculado = 11 - resto;

  if (dvCalculado === 10) dvCalculado = "K";
  if (dvCalculado === 11) dvCalculado = "0";

  return digitoVerificador == dvCalculado;
}

/**
 * Formatear teléfono
 */
function formatearTelefono(telefono) {
  if (!telefono) return null;
  
  // Remover espacios y caracteres especiales excepto +
  return telefono.replace(/[^\d+]/g, "").trim();
}

/**
 * Formatear correo
 */
function formatearCorreo(correo) {
  if (!correo) return null;
  
  // Convertir a minúsculas y remover espacios
  return correo.toLowerCase().trim();
}

/**
 * Formatear fecha para MySQL (YYYY-MM-DD)
 */
function formatearFechaMySQL(fecha) {
  if (!fecha) return null;
  
  try {
    const date = new Date(fecha);
    if (isNaN(date.getTime())) return null;
    
    return date.toISOString().split("T")[0];
  } catch (error) {
    return null;
  }
}

/**
 * Capitalizar primera letra
 */
function capitalizarPrimeraLetra(texto) {
  if (!texto) return null;
  
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
}

/**
 * Normalizar texto
 */
function normalizarTexto(texto) {
  if (!texto) return null;
  
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Validar y formatear RUT
 */
function formatearRUT(rut) {
  if (!rut) return null;
  
  // Limpiar el RUT
  let rutLimpio = rut.replace(/[.-]/g, "").toUpperCase();
  
  // Asegurar que tenga el formato correcto con guión
  if (!rutLimpio.includes("-") && rutLimpio.length >= 2) {
    rutLimpio = rutLimpio.slice(0, -1) + "-" + rutLimpio.slice(-1);
  }
  
  // Validar
  if (!validarRut(rutLimpio)) {
    console.warn("RUT inválido:", rut);
    return null;
  }
  
  return rutLimpio;
}

/**
 * Validar rango de año
 */
function validarAño(año) {
  if (!año) return false;
  
  const añoNum = parseInt(año);
  return añoNum >= 1950 && añoNum <= new Date().getFullYear() + 1;
}

/**
 * Validar mes
 */
function validarMes(mes) {
  if (!mes) return false;
  
  const mesesValidos = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic",
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
  ];
  
  return mesesValidos.includes(mes.toLowerCase());
}

/**
 * Limpiar y validar número
 */
function limpiarNumero(valor) {
  if (!valor) return null;
  
  const numero = parseFloat(valor.toString().replace(/[^\d.,-]/g, "").replace(",", "."));
  
  return isNaN(numero) ? null : numero;
}

/**
 * Truncar texto a longitud máxima
 */
function truncarTexto(texto, maxLength = 500) {
  if (!texto) return null;
  
  if (texto.length <= maxLength) return texto;
  
  return texto.substring(0, maxLength).trim() + "...";
}

/**
 * Remover caracteres especiales peligrosos para SQL
 */
function sanitizarParaSQL(texto) {
  if (!texto) return null;
  
  return texto
    .replace(/[<>]/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .trim();
}

module.exports = {
  limpiarTextoParaDB,
  validarRut,
  formatearTelefono,
  formatearCorreo,
  formatearFechaMySQL,
  capitalizarPrimeraLetra,
  normalizarTexto,
  formatearRUT,
  validarAño,
  validarMes,
  limpiarNumero,
  truncarTexto,
  sanitizarParaSQL
};