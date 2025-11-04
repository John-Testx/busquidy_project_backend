const pool = require("../../db");

/**
 * Actualizar información general
 */
const updateInformacionGeneral = async (id_freelancer, data) => {
  const fecha_nacimiento = new Date(data.fecha_nacimiento).toISOString().split("T")[0];
  
  const query1 = `
    UPDATE antecedentes_personales
    SET nombres = ?, apellidos = ?, fecha_nacimiento = ?,
    identificacion = ?, nacionalidad = ?, direccion = ?, region = ?, ciudad = ?, comuna = ?
    WHERE id_freelancer = ?
  `;
  const values1 = [
    data.nombres,
    data.apellidos,
    fecha_nacimiento,
    data.identificacion,
    data.nacionalidad,
    data.direccion,
    data.region,
    data.ciudad,
    data.comuna,
    id_freelancer
  ];

  const query2 = `
    UPDATE freelancer
    SET correo_contacto = ?, telefono_contacto = ?
    WHERE id_freelancer = ?
  `;
  const values2 = [data.correo_contacto, data.telefono_contacto, id_freelancer];

  const [result1] = await pool.query(query1, values1);
  const [result2] = await pool.query(query2, values2);

  return result1.affectedRows > 0 || result2.affectedRows > 0;
};

/**
 * Actualizar presentación
 */
const updatePresentacion = async (id_freelancer, data) => {
  const [result] = await pool.query(
    `UPDATE freelancer SET descripcion = ? WHERE id_freelancer = ?`,
    [data.descripcion, id_freelancer]
  );

  return result.affectedRows > 0;
};

/**
 * Actualizar formación
 */
const updateFormacion = async (id_freelancer, data) => {
  const [result] = await pool.query(
    `UPDATE nivel_educacional SET nivel_academico = ?, estado = ? WHERE id_freelancer = ?`,
    [data.nivel_academico, data.estado, id_freelancer]
  );

  return result.affectedRows > 0;
};

/**
 * Actualizar pretensiones
 */
const updatePretensiones = async (id_freelancer, data) => {
  const [result] = await pool.query(
    `UPDATE pretensiones SET disponibilidad = ?, renta_esperada = ? WHERE id_freelancer = ?`,
    [data.disponibilidad, data.renta_esperada, id_freelancer]
  );

  return result.affectedRows > 0;
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
      data.ano_inicio_emp,
      data.mes_inicio_emp,
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
      data.ano_inicio_tra,
      data.mes_inicio_tra,
      data.descripcion
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
    [id_freelancer, data.nivel_academico, data.estado]
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
      data.institucion,
      data.carrera,
      data.carrera_afin,
      data.estado_carrera,
      data.ano_inicio_su,
      data.ano_termino_su
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
      data.institucion,
      data.tipo,
      data.pais,
      data.ciudad,
      data.ano_inicio_ba,
      data.ano_termino_ba
    ]
  );
  
  return result.insertId;
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
      data.institucion,
      data.ano_inicio_cur,
      data.mes_inicio_cur
    ]
  );
  
  return result.insertId;
};

/**
 * Insertar idioma
 */
const insertIdioma = async (id_freelancer, data) => {
  const [result] = await pool.query(
    `INSERT INTO idiomas (id_freelancer, idioma, nivel) VALUES (?, ?, ?)`,
    [id_freelancer, data.idioma, data.nivel]
  );
  
  return result.insertId;
};

/**
 * Insertar habilidad
 */
const insertHabilidad = async (id_freelancer, data) => {
  const [result] = await pool.query(
    `INSERT INTO habilidades (id_freelancer, categoria, habilidad, nivel) VALUES (?, ?, ?, ?)`,
    [id_freelancer, data.categoria, data.habilidad, data.nivel]
  );
  
  return result.insertId;
};

/**
 * Eliminar idioma
 */
const deleteIdioma = async (id_idioma, id_usuario) => {
  const [result] = await pool.query(
    `DELETE FROM idiomas 
     WHERE id_idioma = ? AND id_freelancer = (
       SELECT id_freelancer FROM freelancer WHERE id_usuario = ?
     )`,
    [id_idioma, id_usuario]
  );
  
  return result.affectedRows > 0;
};

/**
 * Eliminar habilidad
 */
const deleteHabilidad = async (id_habilidad, id_usuario) => {
  const [result] = await pool.query(
    `DELETE FROM habilidades 
     WHERE id_habilidad = ? AND id_freelancer = (
       SELECT id_freelancer FROM freelancer WHERE id_usuario = ?
     )`,
    [id_habilidad, id_usuario]
  );
  
  return result.affectedRows > 0;
};

// ==================== QUERIES PARA EXPERIENCIA LABORAL ====================

/**
 * Agregar nueva experiencia laboral
 */
const addExperiencia = async (data, id_freelancer) => {
  const [result] = await pool.query(
    `INSERT INTO trabajo_practica 
     (id_freelancer, experiencia_laboral, experiencia, empresa, cargo, area_trabajo, 
      tipo_cargo, ano_inicio, mes_inicio, descripcion)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id_freelancer,
      data.experiencia_laboral || 'Si',
      data.experiencia || 'Trabajo',
      data.empresa,
      data.cargo,
      data.area_trabajo,
      data.tipo_cargo,
      data.ano_inicio,
      data.mes_inicio,
      data.descripcion
    ]
  );
  return result.insertId;
};

/**
 * Actualizar experiencia laboral
 */
const updateExperiencia = async (itemId, data, id_freelancer) => {
  const [result] = await pool.query(
    `UPDATE trabajo_practica 
     SET experiencia = ?, empresa = ?, cargo = ?, area_trabajo = ?, 
         tipo_cargo = ?, ano_inicio = ?, mes_inicio = ?, descripcion = ?
     WHERE id_trabajo_practica = ? AND id_freelancer = ?`,
    [
      data.experiencia,
      data.empresa,
      data.cargo,
      data.area_trabajo,
      data.tipo_cargo,
      data.ano_inicio,
      data.mes_inicio,
      data.descripcion,
      itemId,
      id_freelancer
    ]
  );
  return result.affectedRows > 0;
};

/**
 * Eliminar experiencia laboral
 */
const deleteExperiencia = async (itemId, id_freelancer) => {
  const [result] = await pool.query(
    `DELETE FROM trabajo_practica 
     WHERE id_trabajo_practica = ? AND id_freelancer = ?`,
    [itemId, id_freelancer]
  );
  return result.affectedRows > 0;
};

// ==================== QUERIES PARA EDUCACIÓN SUPERIOR ====================

/**
 * Agregar nueva educación superior
 */
const addEducacionSuperior = async (data, id_freelancer) => {
  const [result] = await pool.query(
    `INSERT INTO educacion_superior 
     (id_freelancer, institucion, carrera, carrera_afin, estado, ano_inicio, ano_termino)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id_freelancer,
      data.institucion,
      data.carrera,
      data.carrera_afin,
      data.estado,
      data.ano_inicio,
      data.ano_termino
    ]
  );
  return result.insertId;
};

/**
 * Actualizar educación superior
 */
const updateEducacionSuperior = async (itemId, data, id_freelancer) => {
  const [result] = await pool.query(
    `UPDATE educacion_superior 
     SET institucion = ?, carrera = ?, carrera_afin = ?, estado = ?, 
         ano_inicio = ?, ano_termino = ?
     WHERE id_educacion_superior = ? AND id_freelancer = ?`,
    [
      data.institucion,
      data.carrera,
      data.carrera_afin,
      data.estado,
      data.ano_inicio,
      data.ano_termino,
      itemId,
      id_freelancer
    ]
  );
  return result.affectedRows > 0;
};

/**
 * Eliminar educación superior
 */
const deleteEducacionSuperior = async (itemId, id_freelancer) => {
  const [result] = await pool.query(
    `DELETE FROM educacion_superior 
     WHERE id_educacion_superior = ? AND id_freelancer = ?`,
    [itemId, id_freelancer]
  );
  return result.affectedRows > 0;
};

// ==================== QUERIES PARA EDUCACIÓN BÁSICA/MEDIA ====================

/**
 * Agregar nueva educación básica/media
 */
const addEducacionBasica = async (data, id_freelancer) => {
  const [result] = await pool.query(
    `INSERT INTO educacion_basica_media 
     (id_freelancer, institucion, tipo, pais, ciudad, ano_inicio, ano_termino)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id_freelancer,
      data.institucion,
      data.tipo,
      data.pais,
      data.ciudad,
      data.ano_inicio,
      data.ano_termino
    ]
  );
  return result.insertId;
};

/**
 * Actualizar educación básica/media
 */
const updateEducacionBasica = async (itemId, data, id_freelancer) => {
  const [result] = await pool.query(
    `UPDATE educacion_basica_media 
     SET institucion = ?, tipo = ?, pais = ?, ciudad = ?, 
         ano_inicio = ?, ano_termino = ?
     WHERE id_educacion_basica_media = ? AND id_freelancer = ?`,
    [
      data.institucion,
      data.tipo,
      data.pais,
      data.ciudad,
      data.ano_inicio,
      data.ano_termino,
      itemId,
      id_freelancer
    ]
  );
  return result.affectedRows > 0;
};

/**
 * Eliminar educación básica/media
 */
const deleteEducacionBasica = async (itemId, id_freelancer) => {
  const [result] = await pool.query(
    `DELETE FROM educacion_basica_media 
     WHERE id_educacion_basica_media = ? AND id_freelancer = ?`,
    [itemId, id_freelancer]
  );
  return result.affectedRows > 0;
};

// ==================== QUERIES PARA CURSOS ====================

/**
 * Agregar nuevo curso
 */
const addCurso = async (data, id_freelancer) => {
  const [result] = await pool.query(
    `INSERT INTO curso (id_freelancer, nombre_curso, institucion, ano_inicio, mes_inicio)
     VALUES (?, ?, ?, ?, ?)`,
    [
      id_freelancer,
      data.nombre_curso,
      data.institucion,
      data.ano_inicio,
      data.mes_inicio
    ]
  );
  return result.insertId;
};

/**
 * Actualizar curso
 */
const updateCurso = async (itemId, data, id_freelancer) => {
  const [result] = await pool.query(
    `UPDATE curso 
     SET nombre_curso = ?, institucion = ?, ano_inicio = ?, mes_inicio = ?
     WHERE id_curso = ? AND id_freelancer = ?`,
    [
      data.nombre_curso,
      data.institucion,
      data.ano_inicio,
      data.mes_inicio,
      itemId,
      id_freelancer
    ]
  );
  return result.affectedRows > 0;
};

/**
 * Eliminar curso
 */
const deleteCurso = async (itemId, id_freelancer) => {
  const [result] = await pool.query(
    `DELETE FROM curso 
     WHERE id_curso = ? AND id_freelancer = ?`,
    [itemId, id_freelancer]
  );
  return result.affectedRows > 0;
};

// ==================== QUERIES PARA IDIOMAS ====================

/**
 * Agregar nuevo idioma
 */
const addIdioma = async (data, id_freelancer) => {
  const [result] = await pool.query(
    `INSERT INTO idiomas (id_freelancer, idioma, nivel) VALUES (?, ?, ?)`,
    [id_freelancer, data.idioma, data.nivel]
  );
  return result.insertId;
};

/**
 * Actualizar idioma
 */
const updateIdioma = async (itemId, data, id_freelancer) => {
  const [result] = await pool.query(
    `UPDATE idiomas 
     SET idioma = ?, nivel = ?
     WHERE id_idioma = ? AND id_freelancer = ?`,
    [
      data.idioma,
      data.nivel,
      itemId,
      id_freelancer
    ]
  );
  return result.affectedRows > 0;
};

// ==================== QUERIES PARA HABILIDADES ====================

/**
 * Agregar nueva habilidad
 */
const addHabilidad = async (data, id_freelancer) => {
  const [result] = await pool.query(
    `INSERT INTO habilidades (id_freelancer, categoria, habilidad, nivel) VALUES (?, ?, ?, ?)`,
    [id_freelancer, data.categoria, data.habilidad, data.nivel]
  );
  return result.insertId;
};

/**
 * Actualizar habilidad
 */
const updateHabilidad = async (itemId, data, id_freelancer) => {
  const [result] = await pool.query(
    `UPDATE habilidades 
     SET categoria = ?, habilidad = ?, nivel = ?
     WHERE id_habilidad = ? AND id_freelancer = ?`,
    [
      data.categoria,
      data.habilidad,
      data.nivel,
      itemId,
      id_freelancer
    ]
  );
  return result.affectedRows > 0;
};

// ==================== QUERIES PARA INCLUSIÓN LABORAL ====================

/**
 * Agregar inclusión laboral
 */
const addInclusionLaboral = async (data, id_freelancer) => {
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
 * Actualizar inclusión laboral
 */
const updateInclusionLaboral = async (itemId, data, id_freelancer) => {
  const [result] = await pool.query(
    `UPDATE inclusion_laboral 
     SET discapacidad = ?, registro_nacional = ?, pension_invalidez = ?, 
         ajuste_entrevista = ?, tipo_discapacidad = ?
     WHERE id_inclusion_laboral = ? AND id_freelancer = ?`,
    [
      data.discapacidad,
      data.registro_nacional,
      data.pension_invalidez,
      data.ajuste_entrevista,
      data.tipo_discapacidad,
      itemId,
      id_freelancer
    ]
  );
  return result.affectedRows > 0;
};

// ==================== QUERIES PARA EMPRENDIMIENTO ====================

/**
 * Agregar emprendimiento
 */
const addEmprendimiento = async (data, id_freelancer) => {
  const [result] = await pool.query(
    `INSERT INTO emprendimiento 
     (id_freelancer, emprendedor, interesado, ano_inicio, mes_inicio, sector_emprendimiento)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      id_freelancer,
      data.emprendedor,
      data.interesado,
      data.ano_inicio,
      data.mes_inicio,
      data.sector_emprendimiento
    ]
  );
  return result.insertId;
};

/**
 * Actualizar emprendimiento
 */
const updateEmprendimiento = async (itemId, data, id_freelancer) => {
  const [result] = await pool.query(
    `UPDATE emprendimiento 
     SET emprendedor = ?, interesado = ?, ano_inicio = ?, 
         mes_inicio = ?, sector_emprendimiento = ?
     WHERE id_emprendimiento = ? AND id_freelancer = ?`,
    [
      data.emprendedor,
      data.interesado,
      data.ano_inicio,
      data.mes_inicio,
      data.sector_emprendimiento,
      itemId,
      id_freelancer
    ]
  );
  return result.affectedRows > 0;
};

/**
 * Eliminar inclusión laboral
 */
const deleteInclusionLaboral = async (itemId, id_freelancer) => {
  const [result] = await pool.query(
    `DELETE FROM inclusion_laboral 
     WHERE id_inclusion_laboral = ? AND id_freelancer = ?`,
    [itemId, id_freelancer]
  );
  return result.affectedRows > 0;
};

/**
 * Eliminar emprendimiento
 */
const deleteEmprendimiento = async (itemId, id_freelancer) => {
  const [result] = await pool.query(
    `DELETE FROM emprendimiento 
     WHERE id_emprendimiento = ? AND id_freelancer = ?`,
    [itemId, id_freelancer]
  );
  return result.affectedRows > 0;
};

/**
 * Actualizar nivel educacional
 */
const updateNivelEducacional = async (itemId, data, id_freelancer) => {
  const [result] = await pool.query(
    `UPDATE nivel_educacional 
     SET nivel_academico = ?, estado = ?
     WHERE id_nivel_educacional = ? AND id_freelancer = ?`,
    [
      data.nivel_academico,
      data.estado,
      itemId,
      id_freelancer
    ]
  );
  return result.affectedRows > 0;
};

module.exports = {
  updateInformacionGeneral,
  updatePresentacion,
  updateFormacion,
  updatePretensiones,
  insertInclusionLaboral,
  insertEmprendimiento,
  insertTrabajoPractica,
  insertNivelEducacional,
  insertEducacionSuperior,
  insertEducacionBasicaMedia,
  insertCurso,
  insertIdioma,
  insertHabilidad,
  deleteIdioma,
  deleteHabilidad,

  addExperiencia,
  updateExperiencia,
  deleteExperiencia,
  addEducacionSuperior,
  updateEducacionSuperior,
  deleteEducacionSuperior,
  addEducacionBasica,
  updateEducacionBasica,
  deleteEducacionBasica,
  addCurso,
  updateCurso,
  deleteCurso,
  addIdioma,
  updateIdioma,
  addHabilidad,
  updateHabilidad,
  addInclusionLaboral,
  updateInclusionLaboral,
  addEmprendimiento,
  updateEmprendimiento,
  deleteInclusionLaboral,
  deleteEmprendimiento,
  updateNivelEducacional
};