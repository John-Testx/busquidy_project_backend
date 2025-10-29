const { DocumentProcessorServiceClient } = require('@google-cloud/documentai').v1;
const fs = require('fs');
require('dotenv').config();

// Configuración del cliente
const client = new DocumentProcessorServiceClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

// Construir el nombre del procesador (tu Custom Extractor)
const processorName = `projects/${process.env.GOOGLE_PROJECT_ID}/locations/${process.env.GOOGLE_LOCATION}/processors/${process.env.GOOGLE_PROCESSOR_ID}`;

/**
 * Parsear CV usando Custom Extractor entrenado
 */
async function parseCV(filePath, fileMimeType) {
  try {
    console.log('📄 Procesando CV con Custom Extractor...');
    
    const fileBuffer = fs.readFileSync(filePath);
    const encodedDocument = fileBuffer.toString('base64');

    const request = {
      name: processorName,
      rawDocument: {
        content: encodedDocument,
        mimeType: fileMimeType,
      },
    };

    console.log('🚀 Enviando a Google Document AI Custom Extractor...');
    console.log('   Procesador:', processorName);
    
    const [result] = await client.processDocument(request);
    const { document } = result;

    console.log('✅ Respuesta recibida del Custom Extractor');

    // Mostrar entidades encontradas
    const entities = document.entities || [];
    console.log(`📊 Entidades extraídas: ${entities.length}`);
    
    if (entities.length > 0) {
      console.log('Tipos de entidades encontradas:');
      entities.forEach((entity, index) => {
        console.log(`  ${index + 1}. ${entity.type}: "${entity.mentionText || entity.normalizedValue?.text || ''}"`);
      });
    }

    // Mapear entidades a tu estructura
    const parsedData = mapCustomExtractorEntities(entities);

    console.log('✅ Datos mapeados exitosamente');

    return parsedData;

  } catch (error) {
    console.error('❌ Error al procesar con Custom Extractor:', error);
    throw new Error(`No se pudo procesar el CV: ${error.message}`);
  } finally {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('🗑️ Archivo temporal eliminado');
    }
  }
}

/**
 * Mapear entidades del Custom Extractor a estructura de BD
 */
function mapCustomExtractorEntities(entities) {
  // Helper para buscar entidades
  const findEntity = (type) => entities.find(e => e.type === type);
  const findEntities = (type) => entities.filter(e => e.type === type);
  
  const getText = (entity) => {
    if (!entity) return null;
    return entity.mentionText || entity.normalizedValue?.text || null;
  };
  
  const getProperty = (entity, propType) => {
    if (!entity || !entity.properties) return null;
    const prop = entity.properties.find(p => p.type === propType);
    return getText(prop);
  };

  // ========== DATOS BÁSICOS ==========
  const nombreCompleto = getText(findEntity('nombre_completo')) || 
                         getText(findEntity('nombre')) ||
                         getText(findEntity('name'));
  
  const { nombres, apellidos } = dividirNombreCompleto(nombreCompleto);
  
  const email = getText(findEntity('email')) || 
                getText(findEntity('correo')) ||
                getText(findEntity('correo_electronico'));
  
  const telefono = getText(findEntity('telefono')) || 
                   getText(findEntity('phone')) ||
                   getText(findEntity('telefono_contacto'));
  
  const direccion = getText(findEntity('direccion')) || 
                    getText(findEntity('address'));
  
  const linkedin = getText(findEntity('linkedin')) || 
                   getText(findEntity('linkedin_link'));
  
  const descripcion = getText(findEntity('descripcion_profesional')) || 
                      getText(findEntity('descripcion')) ||
                      getText(findEntity('resumen')) ||
                      getText(findEntity('summary'));
  
  const fechaNac = getText(findEntity('fecha_nacimiento')) || 
                   getText(findEntity('fecha_nac'));
  
  const nacionalidad = getText(findEntity('nacionalidad')) || 
                       getText(findEntity('nationality'));
  
  const rut = getText(findEntity('rut')) || 
              getText(findEntity('identificacion'));
  
  const region = getText(findEntity('region'));
  const ciudad = getText(findEntity('ciudad')) || getText(findEntity('city'));
  const comuna = getText(findEntity('comuna'));
  
  const estadoCivil = getText(findEntity('estado_civil')) || 
                      getText(findEntity('marital_status'));

  // ========== EXPERIENCIAS ==========
  const experiencias = findEntities('experiencias')
    .concat(findEntities('experiencia'))
    .concat(findEntities('trabajo'))
    .concat(findEntities('experience'))
    .map(exp => ({
      empresa: getProperty(exp, 'empresa') || getProperty(exp, 'company') || getText(exp),
      cargo: getProperty(exp, 'cargo') || getProperty(exp, 'puesto') || getProperty(exp, 'position'),
      area_trabajo: getProperty(exp, 'area') || getProperty(exp, 'area_trabajo'),
      tipo_cargo: getProperty(exp, 'tipo_cargo') || getProperty(exp, 'tipo'),
      descripcion: getProperty(exp, 'descripcion') || getProperty(exp, 'description'),
      ano_inicio: extraerAno(getProperty(exp, 'fecha_inicio') || getProperty(exp, 'start_date')),
      mes_inicio: extraerMes(getProperty(exp, 'fecha_inicio') || getProperty(exp, 'start_date')),
      experiencia_laboral: 'Si',
    }));

  // ========== EDUCACIÓN ==========
  const educaciones = findEntities('educacion')
    .concat(findEntities('education'))
    .concat(findEntities('estudios'))
    .map(edu => {
      const institucion = getProperty(edu, 'institucion') || getProperty(edu, 'institution') || getText(edu);
      const carrera = getProperty(edu, 'carrera') || getProperty(edu, 'titulo') || getProperty(edu, 'degree');
      const tipo = getProperty(edu, 'tipo') || determinarTipoEducacion(carrera, institucion);
      const estado = getProperty(edu, 'estado') || getProperty(edu, 'status') || 'Completa';
      const pais = getProperty(edu, 'pais') || getProperty(edu, 'country');
      const ciudad = getProperty(edu, 'ciudad') || getProperty(edu, 'city');
      
      return {
        institucion,
        carrera,
        carrera_afin: getProperty(edu, 'carrera_afin'),
        tipo,
        estado,
        pais,
        ciudad,
        ano_inicio: extraerAno(getProperty(edu, 'fecha_inicio') || getProperty(edu, 'start_date')),
        ano_termino: extraerAno(getProperty(edu, 'fecha_fin') || getProperty(edu, 'end_date')),
      };
    });

  // ========== HABILIDADES ==========
  const habilidades = findEntities('habilidades')
    .concat(findEntities('habilidad'))
    .concat(findEntities('skills'))
    .concat(findEntities('skill'))
    .map(skill => ({
      habilidad: getText(skill),
      categoria: getProperty(skill, 'categoria') || categorizarHabilidad(getText(skill)),
      nivel: getProperty(skill, 'nivel') || 'Intermedio',
    }));

  // ========== IDIOMAS ==========
  const idiomas = findEntities('idiomas')
    .concat(findEntities('idioma'))
    .concat(findEntities('languages'))
    .concat(findEntities('language'))
    .map(lang => ({
      idioma: getText(lang) || getProperty(lang, 'idioma'),
      nivel: getProperty(lang, 'nivel') || getProperty(lang, 'proficiency') || 'Intermedio',
    }));

  // ========== CURSOS ==========
  const cursos = findEntities('cursos')
    .concat(findEntities('curso'))
    .concat(findEntities('certificaciones'))
    .concat(findEntities('certifications'))
    .map(curso => ({
      nombre_curso: getText(curso) || getProperty(curso, 'nombre'),
      institucion: getProperty(curso, 'institucion') || getProperty(curso, 'institution'),
      ano_inicio: extraerAno(getProperty(curso, 'fecha') || getProperty(curso, 'date')),
      mes_inicio: extraerMes(getProperty(curso, 'fecha') || getProperty(curso, 'date')),
    }));

  // ========== INCLUSIÓN LABORAL ==========
  const discapacidad = getText(findEntity('discapacidad')) || 
                       getText(findEntity('disability'));
  
  const inclusionLaboral = discapacidad ? {
    discapacidad: discapacidad.toLowerCase().includes('si') || 
                  discapacidad.toLowerCase().includes('yes') ? 'Si' : 'No',
    registro_nacional: getText(findEntity('registro_nacional')),
    pension_invalidez: getText(findEntity('pension_invalidez')),
    ajuste_entrevista: getText(findEntity('ajuste_entrevista')),
    tipo_discapacidad: getText(findEntity('tipo_discapacidad')),
  } : null;

  // ========== EMPRENDIMIENTO ==========
  const emprendedor = getText(findEntity('emprendedor')) || 
                      getText(findEntity('emprendimiento'));
  
  const emprendimiento = emprendedor ? {
    emprendedor: emprendedor.toLowerCase().includes('si') || 
                 emprendedor.toLowerCase().includes('yes') ? 'Si' : 'No',
    interesado: getText(findEntity('interesado_emprendimiento')),
    ano_inicio: extraerAno(getText(findEntity('inicio_emprendimiento'))),
    mes_inicio: extraerMes(getText(findEntity('inicio_emprendimiento'))),
    sector_emprendimiento: getText(findEntity('sector_emprendimiento')),
  } : null;

  // ========== PRETENSIONES (NUEVO) ==========
  const disponibilidad = getText(findEntity('disponibilidad')) || 
                         getText(findEntity('availability')) ||
                         getText(findEntity('disponibilidad_laboral')) ||
                         'Inmediata';
  
  const rentaEsperada = getText(findEntity('renta_esperada')) || 
                        getText(findEntity('salario_esperado')) ||
                        getText(findEntity('expected_salary')) ||
                        getText(findEntity('pretension_renta'));
  
  const pretensiones = {
    disponibilidad: disponibilidad,
    renta_esperada: extraerMonto(rentaEsperada),
  };

  // ========== NIVEL EDUCACIONAL ==========
  const nivelEducacional = determinarNivelEducacional(educaciones);

  return {
    freelancer: {
      correo_contacto: email,
      telefono_contacto: telefono,
      linkedin_link: linkedin,
      descripcion_freelancer: descripcion,
    },
    antecedentes_personales: {
      nombres,
      apellidos,
      fecha_nacimiento: formatearFecha(fechaNac),
      identificacion: rut,
      nacionalidad,
      direccion,
      region,
      ciudad: ciudad,
      comuna,
      estado_civil: estadoCivil,
    },
    inclusion_laboral: inclusionLaboral,
    emprendimiento: emprendimiento,
    experiencias: experiencias.length > 0 ? experiencias : null,
    educaciones: educaciones.length > 0 ? educaciones : null,
    nivel_educacional: nivelEducacional,
    habilidades: habilidades.length > 0 ? habilidades : null,
    idiomas: idiomas.length > 0 ? idiomas : null,
    cursos: cursos.length > 0 ? cursos : null,
    pretensiones: pretensiones, // ✅ AHORA SE INCLUYE
  };
}

// =============== FUNCIONES AUXILIARES ===============

function dividirNombreCompleto(nombreCompleto) {
  if (!nombreCompleto) return { nombres: null, apellidos: null };
  
  const partes = nombreCompleto.trim().split(/\s+/);
  
  if (partes.length === 1) return { nombres: partes[0], apellidos: null };
  if (partes.length === 2) return { nombres: partes[0], apellidos: partes[1] };
  if (partes.length === 3) return { nombres: partes[0], apellidos: `${partes[1]} ${partes[2]}` };
  if (partes.length === 4) return { nombres: `${partes[0]} ${partes[1]}`, apellidos: `${partes[2]} ${partes[3]}` };
  
  const mitad = Math.floor(partes.length / 2);
  return {
    nombres: partes.slice(0, mitad).join(' '),
    apellidos: partes.slice(mitad).join(' '),
  };
}

function formatearFecha(fechaStr) {
  if (!fechaStr) return null;
  
  try {
    // Intentar parsear la fecha
    const date = new Date(fechaStr);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
  } catch {
    return null;
  }
}

function extraerAno(fechaStr) {
  if (!fechaStr) return null;
  
  const match = fechaStr.match(/\d{4}/);
  return match ? parseInt(match[0]) : null;
}

function extraerMes(fechaStr) {
  if (!fechaStr) return null;
  
  const meses = {
    'enero': 1, 'ene': 1, 'jan': 1,
    'febrero': 2, 'feb': 2,
    'marzo': 3, 'mar': 3,
    'abril': 4, 'abr': 4, 'apr': 4,
    'mayo': 5, 'may': 5,
    'junio': 6, 'jun': 6,
    'julio': 7, 'jul': 7,
    'agosto': 8, 'ago': 8, 'aug': 8,
    'septiembre': 9, 'sep': 9,
    'octubre': 10, 'oct': 10,
    'noviembre': 11, 'nov': 11,
    'diciembre': 12, 'dic': 12, 'dec': 12,
  };
  
  const mesStr = fechaStr.toLowerCase();
  for (const [mes, num] of Object.entries(meses)) {
    if (mesStr.includes(mes)) return num;
  }
  
  return null;
}

/**
 * Extraer monto de renta esperada
 */
function extraerMonto(montoStr) {
  if (!montoStr) return null;
  
  // Eliminar símbolos de moneda y separadores de miles
  const numeroStr = montoStr.replace(/[$€£¥CLP\s.]/gi, '').replace(/,/g, '');
  const numero = parseFloat(numeroStr);
  
  return !isNaN(numero) ? numero : null;
}

/**
 * Determinar tipo de educación basado en carrera/institución
 */
function determinarTipoEducacion(carrera, institucion) {
  if (!carrera && !institucion) return null;
  
  const texto = `${carrera} ${institucion}`.toLowerCase();
  
  if (texto.includes('universidad') || texto.includes('university') || 
      texto.includes('ingenier') || texto.includes('licenciatura')) {
    return 'Universidad';
  }
  if (texto.includes('postgrado') || texto.includes('magister') || 
      texto.includes('master') || texto.includes('mba')) {
    return 'Postgrado';
  }
  if (texto.includes('doctorado') || texto.includes('phd')) {
    return 'Doctorado';
  }
  if (texto.includes('media') || texto.includes('secundaria') || 
      texto.includes('high school')) {
    return 'Educación media';
  }
  if (texto.includes('básica') || texto.includes('primaria') || 
      texto.includes('elementary')) {
    return 'Educación básica';
  }
  
  return null;
}

/**
 * Determinar nivel educacional más alto
 */
function determinarNivelEducacional(educaciones) {
  if (!educaciones || educaciones.length === 0) return null;
  
  const jerarquia = {
    'Doctorado': 5,
    'Postgrado': 4,
    'Universidad': 3,
    'Media': 2,
    'Basica': 1,
  };
  
  let nivelMasAlto = null;
  let valorMasAlto = 0;
  
  educaciones.forEach(edu => {
    const tipo = edu.tipo;
    if (tipo && jerarquia[tipo] > valorMasAlto) {
      valorMasAlto = jerarquia[tipo];
      nivelMasAlto = tipo;
    }
  });
  
  if (!nivelMasAlto) return null;
  
  // Determinar si está completo o incompleto
  const educacionNivel = educaciones.find(e => e.tipo === nivelMasAlto);
  const estado = educacionNivel?.estado === 'Incompleta' || 
                 educacionNivel?.estado === 'Cursando' ? 'Incompleta' : 'Completa';
  
  return {
    nivel_academico: nivelMasAlto,
    estado: estado,
  };
}

/**
 * Categorizar habilidad automáticamente
 */
function categorizarHabilidad(habilidad) {
  if (!habilidad) return 'Técnica';
  
  const texto = habilidad.toLowerCase();
  
  // Habilidades técnicas
  if (texto.match(/(python|java|javascript|react|angular|vue|node|sql|css|html|php|ruby|c\+\+|aws|azure|docker|kubernetes)/i)) {
    return 'Técnica';
  }
  
  // Habilidades blandas
  if (texto.match(/(liderazgo|comunicación|trabajo en equipo|resolución|creatividad|adaptabilidad|organización)/i)) {
    return 'Blanda';
  }
  
  // Diseño
  if (texto.match(/(photoshop|illustrator|figma|sketch|diseño|ui|ux)/i)) {
    return 'Diseño';
  }
  
  return 'Técnica'; // Por defecto
}

module.exports = { parseCV };