const pool = require("../../db");

/**
 * Queries de perfil de freelancer
 */

// ==================== CONSULTAS BÁSICAS DE FREELANCER ====================

/**
 * Obtener datos de freelancer por ID de usuario (retorna array)
 * @param {number} id_usuario - ID del usuario
 * @returns {Promise<Array>} Array con datos del freelancer
 */
const findFreelancerByUserId = async (id_usuario) => {
  const [rows] = await pool.query(
    "SELECT * FROM freelancer WHERE id_usuario = ?",
    [id_usuario]
  );
  return rows;
};

/**
 * Obtener datos de freelancer por ID de usuario (alias para compatibilidad)
 */
const getFreelancerByUserId = async (id_usuario) => {
  return await findFreelancerByUserId(id_usuario);
};

/**
 * Buscar freelancer por ID de usuario (retorna objeto único o null)
 * @param {number} id_usuario - ID del usuario
 * @returns {Promise<Object|null>} Objeto con datos del freelancer o null
 */
const buscarFreelancerByUserId = async (id_usuario) => {
  const [rows] = await pool.query(
    "SELECT * FROM freelancer WHERE id_usuario = ?",
    [id_usuario]
  );
  return rows[0] || null;
};

// ==================== VERIFICACIONES Y DATOS COMPLETOS ====================

/**
 * Verificar si existe perfil de freelancer
 */
const checkFreelancerProfileExists = async (id_freelancer) => {
  const [antecedentes] = await pool.query(
    "SELECT * FROM antecedentes_personales WHERE id_freelancer = ?",
    [id_freelancer]
  );
  
  return {
    exists: antecedentes.length > 0,
    data: antecedentes[0] || null
  };
};

/**
 * Obtener datos completos del perfil
 */
const getCompleteProfileData = async (id_freelancer) => {
  const [antecedentes] = await pool.query(
    "SELECT * FROM antecedentes_personales WHERE id_freelancer = ?",
    [id_freelancer]
  );

  const [inclusionLaboral] = await pool.query(
    "SELECT * FROM inclusion_laboral WHERE id_freelancer = ?",
    [id_freelancer]
  );

  const [emprendimiento] = await pool.query(
    "SELECT * FROM emprendimiento WHERE id_freelancer = ?",
    [id_freelancer]
  );

  const [trabajoPractica] = await pool.query(
    "SELECT * FROM trabajo_practica WHERE id_freelancer = ?",
    [id_freelancer]
  );

  const [nivelEducacional] = await pool.query(
    "SELECT * FROM nivel_educacional WHERE id_freelancer = ?",
    [id_freelancer]
  );

  const [educacionSuperior] = await pool.query(
    "SELECT * FROM educacion_superior WHERE id_freelancer = ?",
    [id_freelancer]
  );

  const [educacionBasica] = await pool.query(
    "SELECT * FROM educacion_basica_media WHERE id_freelancer = ?",
    [id_freelancer]
  );

  const [idiomas] = await pool.query(
    "SELECT * FROM idiomas WHERE id_freelancer = ?",
    [id_freelancer]
  );

  const [habilidades] = await pool.query(
    "SELECT * FROM habilidades WHERE id_freelancer = ?",
    [id_freelancer]
  );

  const [cursos] = await pool.query(
    "SELECT * FROM curso WHERE id_freelancer = ?",
    [id_freelancer]
  );

  const [pretensiones] = await pool.query(
    "SELECT * FROM pretensiones WHERE id_freelancer = ?",
    [id_freelancer]
  );

  return {
    antecedentesPersonales: antecedentes[0] || {},
    inclusionLaboral: inclusionLaboral[0] || {},
    emprendimiento: emprendimiento || [],
    trabajoPractica: trabajoPractica || [],
    nivelEducacional: nivelEducacional[0] || {},
    educacionSuperior: educacionSuperior || {},
    educacionBasicaMedia: educacionBasica || {},
    idiomas: idiomas || [],
    habilidades: habilidades || [],
    curso: cursos || [],
    pretensiones: pretensiones[0] || {}
  };
};

// ==================== GESTIÓN DE CV ====================

/**
 * Obtener URL del CV desde la base de datos
 * @param {number} idFreelancer - ID del freelancer
 * @returns {Promise<string|null>} URL del CV o null
 */
const getCVUrl = async (idFreelancer) => {
  const [result] = await pool.query(
    "SELECT cv_url FROM freelancer WHERE id_freelancer = ?",
    [idFreelancer]
  );
  return result.length > 0 ? result[0].cv_url : null;
};

/**
 * Obtener URL del CV (alias para compatibilidad)
 */
const getCvUrlFromDB = async (idFreelancer) => {
  return await getCVUrl(idFreelancer);
};

/**
 * Actualizar CV URL
 */
const updateCVUrl = async (id_freelancer, cv_url) => {
  const [result] = await pool.query(
    "UPDATE freelancer SET cv_url = ? WHERE id_freelancer = ?",
    [cv_url, id_freelancer]
  );
  return result.affectedRows > 0;
};

// ==================== ACTUALIZACIONES ====================

/**
 * Actualizar información del freelancer
 */
const updateFreelancerInfo = async (id_freelancer, data) => {
  const [result] = await pool.query(
    `UPDATE freelancer 
     SET correo_contacto = ?, telefono_contacto = ?, linkedin_link = ?, descripcion = ? 
     WHERE id_freelancer = ?`,
    [
      data.correo_contacto,
      data.telefono_contacto,
      data.linkedin_link,
      data.descripcion_freelancer,
      id_freelancer
    ]
  );
  return result.affectedRows > 0;
};

// ==================== INSERCIONES ====================

/**
 * Insertar antecedentes personales
 */
const insertAntecedentesPersonales = async (id_freelancer, data) => {
  const [result] = await pool.query(
    `INSERT INTO antecedentes_personales 
     (id_freelancer, nombres, apellidos, fecha_nacimiento, identificacion, nacionalidad, 
      direccion, region, ciudad, comuna, estado_civil)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id_freelancer,
      data.nombres,
      data.apellidos,
      data.fecha_nacimiento,
      data.identificacion,
      data.nacionalidad,
      data.direccion,
      data.region,
      data.ciudad_freelancer,
      data.comuna,
      data.estado_civil
    ]
  );
  return result.insertId;
};

/**
 * Insertar inclusión laboral
 */
const insertInclusionLaboral = async (id_freelancer, data) => {
  const [result] = await pool.query(
    `INSERT INTO inclusion_laboral 
     (id_freelancer, discapacidad, registro_nacional, pension_invalidez, ajuste_entrevista, tipo_discapacidad)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      id_freelancer,
      data.discapacidad,
      data.registro_nacional,
      data.pension_invalidez,
      data.ajuste_entrevista,
      data.tipo_discapacidad
    ]
  );
  return result.insertId;
};

/**
 * Insertar emprendimiento
 */
const insertEmprendimiento = async (id_freelancer, data) => {
  const [result] = await pool.query(
    `INSERT INTO emprendimiento 
     (id_freelancer, emprendedor, interesado, ano_inicio, mes_inicio, sector_emprendimiento)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      id_freelancer,
      data.emprendedor,
      data.interesado,
      data.ano_inicio_emprendimiento,
      data.mes_inicio_emprendimiento,
      data.sector_emprendimiento
    ]
  );
  return result.insertId;
};

/**
 * Insertar trabajo/práctica
 */
const insertTrabajoPractica = async (id_freelancer, data) => {
  const [result] = await pool.query(
    `INSERT INTO trabajo_practica 
     (id_freelancer, experiencia_laboral, experiencia, empresa, cargo, area_trabajo, 
      tipo_cargo, ano_inicio, mes_inicio, descripcion)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id_freelancer,
      data.experiencia_laboral,
      data.experiencia,
      data.empresa,
      data.cargo,
      data.area_trabajo,
      data.tipo_cargo,
      data.ano_inicio_trabajo,
      data.mes_inicio_trabajo,
      data.descripcion_trabajo
    ]
  );
  return result.insertId;
};

/**
 * Insertar nivel educacional
 */
const insertNivelEducacional = async (id_freelancer, data) => {
  const [result] = await pool.query(
    `INSERT INTO nivel_educacional (id_freelancer, nivel_academico, estado)
     VALUES (?, ?, ?)`,
    [id_freelancer, data.nivel_academico, data.estado_educacional]
  );
  return result.insertId;
};

/**
 * Insertar educación superior
 */
const insertEducacionSuperior = async (id_freelancer, data) => {
  const [result] = await pool.query(
    `INSERT INTO educacion_superior 
     (id_freelancer, institucion, carrera, carrera_afin, estado, ano_inicio, ano_termino)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id_freelancer,
      data.institucion_superior,
      data.carrera,
      data.carrera_afin,
      data.estado_superior,
      data.ano_inicio_superior,
      data.ano_termino_superior
    ]
  );
  return result.insertId;
};

/**
 * Insertar educación básica/media
 */
const insertEducacionBasicaMedia = async (id_freelancer, data) => {
  const [result] = await pool.query(
    `INSERT INTO educacion_basica_media 
     (id_freelancer, institucion, tipo, pais, ciudad, ano_inicio, ano_termino)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id_freelancer,
      data.institucion_basica_media,
      data.tipo,
      data.pais,
      data.ciudad_basica_media,
      data.ano_inicio_basica_media,
      data.ano_termino_basica_media
    ]
  );
  return result.insertId;
};

/**
 * Insertar múltiples idiomas
 */
const insertIdiomas = async (id_freelancer, idiomas) => {
  if (!idiomas || idiomas.length === 0) return [];
  
  const promises = idiomas.map(idioma =>
    pool.query(
      `INSERT INTO idiomas (id_freelancer, idioma, nivel) VALUES (?, ?, ?)`,
      [id_freelancer, idioma.idioma, idioma.nivel_idioma]
    )
  );
  
  const results = await Promise.all(promises);
  return results.map(([result]) => result.insertId);
};

/**
 * Insertar múltiples habilidades
 */
const insertHabilidades = async (id_freelancer, habilidades) => {
  if (!habilidades || habilidades.length === 0) return [];
  
  const promises = habilidades.map(habilidad =>
    pool.query(
      `INSERT INTO habilidades (id_freelancer, categoria, habilidad, nivel) VALUES (?, ?, ?, ?)`,
      [id_freelancer, habilidad.categoria, habilidad.habilidad, habilidad.nivel_habilidad]
    )
  );
  
  const results = await Promise.all(promises);
  return results.map(([result]) => result.insertId);
};

/**
 * Insertar curso
 */
const insertCurso = async (id_freelancer, data) => {
  const [result] = await pool.query(
    `INSERT INTO curso (id_freelancer, nombre_curso, institucion, ano_inicio, mes_inicio) 
     VALUES (?, ?, ?, ?, ?)`,
    [
      id_freelancer,
      data.nombre_curso,
      data.institucion_curso,
      data.ano_inicio_curso,
      data.mes_inicio_curso
    ]
  );
  return result.insertId;
};

/**
 * Insertar pretensiones
 */
const insertPretensiones = async (id_freelancer, data) => {
  const [result] = await pool.query(
    `INSERT INTO pretensiones (id_freelancer, disponibilidad, renta_esperada) 
     VALUES (?, ?, ?)`,
    [id_freelancer, data.disponibilidad, data.renta_esperada]
  );
  return result.insertId;
};

/**
 * Guardar perfil completo del freelancer en la base de datos (legacy)
 * Esta función se mantiene por compatibilidad con código antiguo
 */
const guardarPerfilEnDB = async (data) => {
  console.log("data:", data);
  const {
    id_freelancer,
    cv_url,
    freelancer,
    antecedentesPersonales,
    pretensiones,
  } = data;

  try {
    if (id_freelancer == null) {
      console.log("id_freelancer:", id_freelancer);
      return;
    }

    // Actualizar descripción y cv_url en la tabla freelancer
    await pool.query(
      `UPDATE freelancer 
       SET correo_contacto = ?, telefono_contacto = ?, linkedin_link = ?, descripcion = ?, cv_url = ? 
       WHERE id_freelancer = ?`,
      [
        freelancer.correo, 
        freelancer.telefono, 
        freelancer.linkedin, 
        freelancer.descripcion, 
        cv_url, 
        id_freelancer
      ]
    );

    // Insertar antecedentes personales
    await insertAntecedentesPersonales(id_freelancer, antecedentesPersonales);

    // Insertar pretensiones
    await insertPretensiones(id_freelancer, pretensiones);
  } catch (error) {
    throw error;
  }
};

module.exports = {
  // Consultas básicas
  findFreelancerByUserId,
  getFreelancerByUserId, // Alias
  buscarFreelancerByUserId,
  
  // Verificaciones y datos completos
  checkFreelancerProfileExists,
  getCompleteProfileData,
  
  // Gestión de CV
  getCVUrl,
  getCvUrlFromDB, // Alias
  updateCVUrl,
  
  // Actualizaciones
  updateFreelancerInfo,
  
  // Inserciones
  insertAntecedentesPersonales,
  insertInclusionLaboral,
  insertEmprendimiento,
  insertTrabajoPractica,
  insertNivelEducacional,
  insertEducacionSuperior,
  insertEducacionBasicaMedia,
  insertIdiomas,
  insertHabilidades,
  insertCurso,
  insertPretensiones,
  
  // Legacy
  guardarPerfilEnDB, // Para compatibilidad con código antiguo
};