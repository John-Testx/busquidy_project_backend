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
  deleteHabilidad
};