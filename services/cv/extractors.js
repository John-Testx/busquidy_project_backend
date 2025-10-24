/**
 * Funciones de extracción de datos del CV
 */

/**
 * Extraer nombre completo
 */
function extraerNombre(texto) {
  const patrones = [
    /([A-ZÑÁÉÍÓÚ][a-zñáéíóú]+ [A-ZÑÁÉÍÓÚ][a-zñáéíóú]+ [A-ZÑÁÉÍÓÚ][a-zñáéíóú]+ [A-ZÑÁÉÍÓÚ][a-zñáéíóú]+)/,
    /([A-ZÑÁÉÍÓÚ][a-zñáéíóú]+ [A-ZÑÁÉÍÓÚ][a-zñáéíóú]+ [A-ZÑÁÉÍÓÚ][a-zñáéíóú]+)/,
    /RUN \d{8}-\d\s+([A-ZÑÁÉÍÓÚ][a-zñáéíóú]+ [A-ZÑÁÉÍÓÚ][a-zñáéíóú]+ [A-ZÑÁÉÍÓÚ][a-zñáéíóú]+)(?=\s+Análisis)/i
  ];

  for (const patron of patrones) {
    const match = texto.match(patron);
    if (match) {
      const nombreEncontrado = match[1] || match[0];
      if (nombreEncontrado && !nombreEncontrado.includes("Alto Nivel")) {
        return nombreEncontrado;
      }
    }
  }

  return null;
}

/**
 * Dividir nombre completo en nombres y apellidos
 */
function dividirNombreCompleto(nombreCompleto) {
  if (!nombreCompleto) {
    return { nombres: null, apellidos: null };
  }

  const partes = nombreCompleto.trim().split(/\s+/);

  if (partes.length === 3) {
    return {
      nombres: partes[0],
      apellidos: `${partes[1]} ${partes[2]}`
    };
  }

  if (partes.length === 4) {
    return {
      nombres: `${partes[0]} ${partes[1]}`,
      apellidos: `${partes[2]} ${partes[3]}`
    };
  }

  const mitad = Math.floor(partes.length / 2);
  return {
    nombres: partes.slice(0, mitad).join(" "),
    apellidos: partes.slice(mitad).join(" ")
  };
}

/**
 * Extraer identificación (RUT)
 */
function extraerIdentificacion(texto) {
  texto = texto.toLowerCase().replace(/\s+/g, " ");

  const patrones = [
    /\b(\d{1,2}\.\d{3}\.\d{3}[-][0-9kK])\b/,
    /\b(\d{7,8}[-][0-9kK])\b/,
    /\b(\d{7,8}[0-9kK])\b/,
    /rut\s*[:]\s*(\d{1,2}\.\d{3}\.\d{3}[-]?[0-9kK])/,
    /run\s*[:]\s*(\d{1,2}\.\d{3}\.\d{3}[-]?[0-9kK])/,
    /identificaci[oó]n\s*[:]\s*(\d{1,2}\.\d{3}\.\d{3}[-]?[0-9kK])/
  ];

  for (const patron of patrones) {
    const match = texto.match(patron);
    if (match) {
      let rut = match[1].toUpperCase().replace(/\./g, "");
      if (!rut.includes("-")) {
        rut = rut.slice(0, -1) + "-" + rut.slice(-1);
      }
      return rut;
    }
  }

  return null;
}

/**
 * Extraer fecha de nacimiento
 */
function extraerFechaNacimiento(texto) {
  const fechaStr = extraerDato(texto, /Fecha de Nacimiento\s+(.+)/i);
  if (!fechaStr) return null;

  try {
    const meses = {
      "enero": "01", "febrero": "02", "marzo": "03", "abril": "04",
      "mayo": "05", "junio": "06", "julio": "07", "agosto": "08",
      "septiembre": "09", "octubre": "10", "noviembre": "11", "diciembre": "12"
    };

    const regex = /(\d{1,2})\s+de\s+([A-Za-zá-úÁ-Ú]+)\s+de\s+(\d{4})/i;
    const match = fechaStr.match(regex);

    if (!match) return null;

    const dia = match[1].padStart(2, "0");
    const mesStr = match[2].toLowerCase();
    const año = match[3];
    const mes = meses[mesStr];

    if (!mes) return null;

    const diaNum = parseInt(dia);
    const añoNum = parseInt(año);

    if (diaNum < 1 || diaNum > 31 || añoNum < 1900 || añoNum > 2024) {
      return null;
    }

    return `${año}-${mes}-${dia}`;
  } catch (error) {
    console.error("Error al convertir la fecha:", error);
    return null;
  }
}

/**
 * Extraer nacionalidad
 */
function extraerNacionalidad(texto) {
  texto = texto.toLowerCase().replace(/\s+/g, " ");

  const nacionalidadesComunes = [
    "chilena", "argentina", "peruana", "boliviana",
    "brasileña", "colombiana", "venezolana", "ecuatoriana",
    "uruguaya", "paraguaya", "española", "estadounidense",
    "mexicana", "canadiense", "francesa", "italiana",
    "alemana", "inglesa", "portuguesa", "chileno"
  ];

  const patrones = [
    /nacionalidad\s*[:]\s*([a-zá-úñ]+)/,
    /nacionalidad\s*completa\s*[:]\s*([a-zá-úñ]+)/,
    /datos\s*personales[^\n]*nacionalidad\s*[:]\s*([a-zá-úñ]+)/,
    new RegExp(`(${nacionalidadesComunes.join("|")})`)
  ];

  for (const patron of patrones) {
    const match = texto.match(patron);
    if (match) {
      let nacionalidad = match[1].trim();
      nacionalidad = nacionalidad.charAt(0).toUpperCase() + nacionalidad.slice(1);
      return nacionalidad;
    }
  }

  return null;
}

/**
 * Extraer dirección
 */
function extraerDireccion(texto) {
  texto = texto.toLowerCase().replace(/\s+/g, " ").trim();

  const patronesDireccion = [
    /dirección\s*(.*?)(?:\s*(?:número|teléfono|correo|fecha|género|nacionalidad|estado|antecedentes|\d{2}[-/]\d{2}[-/]\d{4}|ago\.|ene\.|dic\.|mar\.|jul\.))/i
  ];

  for (const patron of patronesDireccion) {
    const match = texto.match(patron);
    if (match) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Extraer región
 */
function extraerRegion(texto) {
  texto = texto.toLowerCase().replace(/\s+/g, " ");

  const regionesChile = [
    "arica y parinacota", "tarapacá", "antofagasta", "atacama", "coquimbo",
    "valparaíso", "metropolitana de santiago", "metropolitana", "o'higgins", "maule",
    "ñuble", "biobío", "araucanía", "los ríos", "los lagos", "aysén",
    "magallanes", "antártica chilena"
  ];

  const regionEncontrada = regionesChile.find(region => texto.includes(region));
  return regionEncontrada || null;
}

/**
 * Extraer comuna
 */
function extraerComuna(texto) {
  texto = texto.toLowerCase().replace(/\s+/g, " ");

  const comunasChile = [
    "cerrillos", "cerro navia", "conchalí", "el bosque", "estación central",
    "huechuraba", "independencia", "la cisterna", "la florida", "la granja",
    "la pintana", "la reina", "las condes", "lo prado", "macul", "maipú",
    "ñuñoa", "pedro aguirre cerda", "peñalolén", "providencia", "pudahuel",
    "quilicura", "quinta normal", "lo espejo", "recoleta", "renca",
    "san joaquín", "san miguel", "san ramón", "vitacura", "puente alto",
    "pirque", "san josé de maipo", "colina", "lampa", "tiltil",
    "san bernardo", "lo barnechea", "buin", "calera de tango", "paine",
    "maría pinto", "talagante", "el monte", "isla de maipo",
    "padre hurtado", "peñaflor"
  ];

  const comunaEncontrada = comunasChile.find(comuna => texto.includes(comuna));
  return comunaEncontrada || null;
}

/**
 * Extraer ciudad
 */
function extraerCiudad(texto) {
  texto = texto.toLowerCase().replace(/\s+/g, " ");

  const ciudadesChile = [
    "santiago", "valparaíso", "concepción", "la serena", "coquimbo",
    "antofagasta", "iquique", "arica", "puerto montt", "temuco",
    "valdivia", "osorno", "puerto varas", "punta arenas", "rancagua"
  ];

  const ciudadEncontrada = ciudadesChile.find(ciudad => texto.includes(ciudad));
  return ciudadEncontrada || null;
}

/**
 * Extraer correo electrónico
 */
function extraerCorreo(texto) {
  const match = texto.match(/[\w.-]+\s*@\s*[\w.-]+\.\w+/);
  return match ? match[0].replace(/\s+/g, "") : null;
}

/**
 * Extraer teléfono
 */
function extraerTelefono(texto) {
  const match = texto.match(/(?:\+\d{1,3}\s?)?(?:\(?\d{1,3}\)?\s?)?\d{7,10}/);
  return match ? match[0].trim() : null;
}

/**
 * Extraer renta esperada
 */
function extraerRenta(texto) {
  texto = texto.toLowerCase().replace(/\s+/g, " ");

  const patronesRenta = [
    /expectativa\s*de\s*renta\s*\n?\s*(\$?\s*\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?)\s*(?:pesos?\s*(?:bruto|l[ií]quido)\s*(?:mensual)?)?/,
    /pretensión\s*de\s*renta\s*[:]\s*(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?)\s*(?:clp)?/,
    /(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?)\s*(?:clp|pesos)/
  ];

  for (const patron of patronesRenta) {
    const match = texto.match(patron);
    if (match) {
      let renta = match[1]
        .replace(/\s|[$]/g, "")
        .replace(/\./g, "")
        .replace(",", ".");

      if (!isNaN(parseFloat(renta))) {
        return parseFloat(renta).toFixed(0);
      }
    }
  }

  return null;
}

/**
 * Extraer disponibilidad
 */
function extraerDisponibilidad(texto) {
  texto = texto.toLowerCase().replace(/\s+/g, " ");

  const patrones = [
    /(?:disponibilidad|disponible)\s*[:]\s*(\d{1,2}\s*de\s*[a-zá-úñ]+\s*de\s*\d{4})/,
    /(?:^\s*)?(inmediata|inicio\s*inmediato|incorporaci[oó]n\s*inmediata)(?=\s|$)/,
    /(?:^|\s)(inmediata)(?=\s*$|\s*[^a-zá-úñ])/
  ];

  for (const patron of patrones) {
    const match = texto.match(patron);
    if (match) {
      let disponibilidad = match[1].trim();
      disponibilidad = disponibilidad.charAt(0).toUpperCase() + disponibilidad.slice(1);
      return disponibilidad;
    }
  }

  return "Inmediata";
}

/**
 * Extraer descripción profesional
 */
function extraerDescripcion(texto) {
  texto = texto.replace(/\r\n/g, "\n").trim();

  const finSeccion = [
    "ANTECEDENTES PERSONALES", "DATOS PERSONALES", "FORMACIÓN ACADÉMICA",
    "FORMACION ACADEMICA", "INFORMACIÓN DE CONTACTO", "EDUCACIÓN", "EDUCACION",
    "RUT", "RUN", "DIRECCIÓN", "DIRECCION", "FECHA DE NACIMIENTO", "ESTADO CIVIL",
    "EXPERIENCIA LABORAL", "HABILIDADES", "SKILLS", "IDIOMAS", "REFERENCIAS",
    "General", "Chilena", "Formación", "[0-9]{1,2} años"
  ].join("|");

  const patrones = [
    new RegExp(`(?:RESUMEN EJECUTIVO|Acerca de mi|RESUMEN PROFESIONAL|PERFIL PROFESIONAL|PERFIL|DESCRIPCIÓN PROFESIONAL)\\s*((?:(?!\\n\\s*(?:${finSeccion})).)*?)(?=\\n\\s*(?:${finSeccion})|$)`, "is"),
    new RegExp(`((?:(?:Estudiante|Egresado|Titulado|Ingeniero|Analista|Desarrollador|Profesional)(?:(?!\\n\\s*(?:${finSeccion})).)*?)(?=\\n\\s*(?:${finSeccion})|$))`, "i"),
    new RegExp(`^\\s*((?:Titulad[oa]|Egresad[oa]|Ingenier[oa]|Analista|Desarrollador[a])[^\\n]*(?:\\s[^\\n]*(?!\\n\\s*(?:${finSeccion})))*)`, "i")
  ];

  const descripciones = [];

  for (const patron of patrones) {
    const match = texto.match(patron);
    if (match && match[1]) {
      const descripcion = match[1].trim();
      if (esDescripcionValida(descripcion)) {
        descripciones.push(descripcion);
      }
    }
  }

  if (descripciones.length > 0) {
    let descripcionFinal = descripciones.reduce((a, b) => 
      a.length > b.length ? a : b
    );

    if (descripcionFinal.length < 200 && descripciones.length > 1) {
      descripcionFinal = descripciones.join(" ").slice(0, 500);
    }

    return descripcionFinal;
  }

  return null;
}

/**
 * Validar si una descripción es significativa
 */
function esDescripcionValida(texto) {
  if (!texto) return false;

  const textoLimpio = texto.replace(/[\s\n\r\t.,;]/g, "");

  if (textoLimpio.length < 50) return false;

  if (/^(?:\s*[-•]\s*[\w\s,]+\s*)+$/m.test(texto)) return false;

  const proporcionNumeros = (texto.match(/\d/g) || []).length / texto.length;
  if (proporcionNumeros > 0.3) return false;

  return true;
}

/**
 * Extraer dato genérico con regex
 */
function extraerDato(texto, regex) {
  const match = texto.match(regex);
  return match ? match[1]?.trim() || match[0]?.trim() : null;
}

module.exports = {
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
};