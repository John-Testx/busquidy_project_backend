const pool = require("../../db");

/**
 * Queries de representantes de empresa
 */

// ==================== CONSULTAS DE LECTURA ====================

/**
 * Obtener representante por ID de empresa
 * @param {number} id_empresa - ID de la empresa
 * @returns {Promise<Array>} Array con datos del representante
 */
const findRepresentanteByEmpresaId = async (id_empresa) => {
  const [rows] = await pool.query(
    "SELECT * FROM representante_empresa WHERE id_empresa = ?",
    [id_empresa]
  );
  return rows;
};

/**
 * Obtener representante por ID de empresa (alias para compatibilidad)
 */
const getRepresentanteByUserId = async (id_empresa) => {
  return await findRepresentanteByEmpresaId(id_empresa);
};

/**
 * Verificar si existe representante para una empresa
 */
const existsRepresentante = async (id_empresa) => {
  const [rows] = await pool.query(
    `SELECT COUNT(*) as count
     FROM representante_empresa
     WHERE id_empresa = ?`,
    [id_empresa]
  );
  return {
    exists: rows[0].count > 0,
    count: rows[0].count
  };
};

// ==================== OPERACIONES DE ESCRITURA ====================

/**
 * Insertar representante de empresa
 */
const insertRepresentante = async (id_empresa, data, connection = pool) => {
  const query = `
    INSERT INTO representante_empresa
    (id_empresa, nombre_completo, cargo, correo_representante, telefono_representante)
    VALUES (?, ?, ?, ?, ?)`;
  const params = [
    id_empresa,
    data.nombre_completo,
    data.cargo,
    data.correo_representante,
    data.telefono_representante
  ];
  const [result] = await connection.query(query, params);
  return result.insertId;
};

/**
 * Actualizar representante de empresa
 */
const updateRepresentante = async (data, id_empresa, connection = pool) => {
  const query = `
    UPDATE representante_empresa SET
      nombre_completo = ?,
      cargo = ?,
      correo_representante = ?,
      telefono_representante = ?
    WHERE id_empresa = ?`;
  const params = [
    data.nombre_completo,
    data.cargo,
    data.correo_representante,
    data.telefono_representante,
    id_empresa
  ];
  const [result] = await connection.query(query, params);
  return result.affectedRows > 0;
};

module.exports = {
  // Consultas de lectura
  findRepresentanteByEmpresaId,
  getRepresentanteByUserId, // Alias para compatibilidad
  existsRepresentante,
  
  // Operaciones de escritura
  insertRepresentante,
  updateRepresentante,
};