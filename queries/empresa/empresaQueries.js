const pool = require("../../db");

/**
 * Queries básicas de empresa
 */

// ==================== CONSULTAS DE LECTURA ====================

/**
 * Obtener empresa por ID de usuario (retorna array)
 * @param {number} id_usuario - ID del usuario
 * @returns {Promise<Array>} Array con datos de la empresa
 */
const findEmpresaByUserId = async (id_usuario) => {
  const [rows] = await pool.query(
    "SELECT * FROM empresa WHERE id_usuario = ?",
    [id_usuario]
  );
  return rows;
};

/**
 * Obtener empresa por ID de usuario (alias para compatibilidad)
 */
const getEmpresaByUserId = async (id_usuario) => {
  return await findEmpresaByUserId(id_usuario);
};

/**
 * Buscar empresa por ID de usuario (retorna objeto único o null)
 * @param {number} id_usuario - ID del usuario
 * @returns {Promise<Object|null>} Objeto con datos de la empresa o null
 */
const buscarEmpresaByUserId = async (id_usuario) => {
  const [rows] = await pool.query(
    "SELECT * FROM empresa WHERE id_usuario = ?",
    [id_usuario]
  );
  return rows[0] || null;
};

/**
 * Obtener empresa por ID de empresa
 * @param {number} id_empresa - ID de la empresa
 * @returns {Promise<Object|null>} Objeto con datos de la empresa o null
 */
const findEmpresaById = async (id_empresa) => {
  const [rows] = await pool.query(
    "SELECT * FROM empresa WHERE id_empresa = ?",
    [id_empresa]
  );
  return rows[0] || null;
};

/**
 * Obtener perfil básico de empresa por ID de usuario
 */
const findEmpresaProfileByUserId = async (id_usuario) => {
  const [rows] = await pool.query(
    `SELECT
      nombre_empresa,
      identificacion_fiscal,
      direccion,
      telefono_contacto,
      correo_empresa,
      pagina_web,
      descripcion,
      sector_industrial
     FROM empresa
     WHERE id_usuario = ?`,
    [id_usuario]
  );
  return rows;
};

/**
 * Verificar si empresa tiene proyectos
 */
const hasProjects = async (id_empresa) => {
  const [rows] = await pool.query(
    "SELECT COUNT(*) as count FROM proyecto WHERE id_empresa = ?",
    [id_empresa]
  );
  return rows[0].count > 0;
};

/**
 * Verificar si existe un proyecto duplicado
 * @param {number} id_empresa - ID de la empresa
 * @param {Object} projectData - Datos del proyecto
 * @returns {Promise<Array>} Array con proyectos duplicados
 */
const checkDuplicateProject = async (id_empresa, projectData) => {
  const [rows] = await pool.query(
    `SELECT * FROM proyecto 
     WHERE id_empresa = ? AND titulo = ?`,
    [id_empresa, projectData.titulo]
  );
  return rows;
};

// ==================== OPERACIONES DE ESCRITURA ====================

/**
 * Actualizar información de empresa por ID de usuario
 */
const updateEmpresaByUserId = async (data, id_usuario, connection = pool) => {
  const query = `
    UPDATE empresa SET
      nombre_empresa = ?,
      identificacion_fiscal = ?,
      direccion = ?,
      telefono_contacto = ?,
      correo_empresa = ?,
      pagina_web = ?,
      descripcion = ?,
      sector_industrial = ?
    WHERE id_usuario = ?`;
  const params = [
    data.nombre_empresa,
    data.identificacion_fiscal,
    data.direccion,
    data.telefono_contacto,
    data.correo_empresa,
    data.pagina_web,
    data.descripcion,
    data.sector_industrial,
    id_usuario
  ];
  const [result] = await connection.query(query, params);
  return result.affectedRows > 0;
};

/**
 * Actualizar información de empresa por ID de empresa
 */
const updateEmpresaByEmpresaId = async (data, id_empresa, connection = pool) => {
  const query = `
    UPDATE empresa SET
      nombre_empresa = ?,
      identificacion_fiscal = ?,
      direccion = ?,
      telefono_contacto = ?,
      correo_empresa = ?,
      pagina_web = ?,
      descripcion = ?,
      sector_industrial = ?
    WHERE id_empresa = ?`;
  const params = [
    data.nombre_empresa,
    data.identificacion_fiscal,
    data.direccion,
    data.telefono_contacto,
    data.correo_empresa,
    data.pagina_web,
    data.descripcion,
    data.sector_industrial,
    id_empresa
  ];
  const [result] = await connection.query(query, params);
  return result.affectedRows > 0;
};

module.exports = {
  // Consultas de lectura
  findEmpresaByUserId,
  getEmpresaByUserId, // Alias para compatibilidad
  buscarEmpresaByUserId,
  findEmpresaById,
  findEmpresaProfileByUserId,
  hasProjects,
  checkDuplicateProject,
  
  // Operaciones de escritura
  updateEmpresaByUserId,
  updateEmpresaByEmpresaId,
};