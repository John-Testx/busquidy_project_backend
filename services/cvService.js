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

  // Extraer datos básicos
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

  // Extraer experiencias (arrays)
  const experiencias = findEntities('experiencias')
    .concat(findEntities('experiencia'))
    .concat(findEntities('trabajo'))
    .concat(findEntities('experience'))
    .map(exp => ({
      empresa: getProperty(exp, 'empresa') || getProperty(exp, 'company') || getText(exp),
      cargo: getProperty(exp, 'cargo') || getProperty(exp, 'puesto') || getProperty(exp, 'position'),
      area_trabajo: getProperty(exp, 'area'),
      descripcion: getProperty(exp, 'descripcion') || getProperty(exp, 'description'),
      ano_inicio: extraerAno(getProperty(exp, 'fecha_inicio') || getProperty(exp, 'start_date')),
      mes_inicio: extraerMes(getProperty(exp, 'fecha_inicio') || getProperty(exp, 'start_date')),
      ano_fin: extraerAno(getProperty(exp, 'fecha_fin') || getProperty(exp, 'end_date')),
      mes_fin: extraerMes(getProperty(exp, 'fecha_fin') || getProperty(exp, 'end_date')),
      experiencia_laboral: true,
    }));

  // Extraer educación
  const educaciones = findEntities('educacion')
    .concat(findEntities('education'))
    .concat(findEntities('estudios'))
    .map(edu => ({
      institucion: getProperty(edu, 'institucion') || getProperty(edu, 'institution') || getText(edu),
      carrera: getProperty(edu, 'carrera') || getProperty(edu, 'titulo') || getProperty(edu, 'degree'),
      estado: getProperty(edu, 'estado') || 'Completo',
      ano_inicio: extraerAno(getProperty(edu, 'fecha_inicio') || getProperty(edu, 'start_date')),
      ano_termino: extraerAno(getProperty(edu, 'fecha_fin') || getProperty(edu, 'end_date')),
    }));

  // Extraer habilidades
  const habilidades = findEntities('habilidades')
    .concat(findEntities('habilidad'))
    .concat(findEntities('skills'))
    .concat(findEntities('skill'))
    .map(skill => ({
      habilidad: getText(skill),
      categoria: 'Técnica',
      nivel: getProperty(skill, 'nivel') || 'Intermedio',
    }));

  // Extraer idiomas
  const idiomas = findEntities('idiomas')
    .concat(findEntities('idioma'))
    .concat(findEntities('languages'))
    .concat(findEntities('language'))
    .map(lang => ({
      idioma: getText(lang) || getProperty(lang, 'idioma'),
      nivel: getProperty(lang, 'nivel') || getProperty(lang, 'proficiency') || 'Intermedio',
    }));

  // Extraer cursos
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
      ciudad_freelancer: ciudad,
      comuna,
      estado_civil: null,
    },
    experiencias: experiencias.length > 0 ? experiencias : null,
    educaciones: educaciones.length > 0 ? educaciones : null,
    habilidades: habilidades.length > 0 ? habilidades : null,
    idiomas: idiomas.length > 0 ? idiomas : null,
    cursos: cursos.length > 0 ? cursos : null,
    pretensiones: {
      disponibilidad: 'Inmediata',
      renta_esperada: null,
    },
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

module.exports = { parseCV };