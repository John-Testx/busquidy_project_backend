const pool = require("../../db");

/**
 * Verificar si existe una suscripción activa para un usuario
 * @param {Object} connection - Conexión de base de datos
 * @param {number} idUsuario - ID del usuario
 * @returns {Promise<boolean>} True si existe suscripción activa
 */
const hasActiveSuscripcion = async (connection, idUsuario) => {
  const [rows] = await connection.query(
    `SELECT id_suscripcion FROM suscripcion 
     WHERE id_usuario = ? AND estado = 'activa' AND fecha_fin >= CURDATE() LIMIT 1`,
    [idUsuario]
  );
  return rows.length > 0;
};

/**
 * Insertar una nueva suscripción
 * @param {Object} connection - Conexión de base de datos
 * @param {Object} data - Datos de la suscripción
 * @returns {Promise<number>} ID de la suscripción insertada
 */
const insertSuscripcion = async (connection, { idUsuario, idPlan, fechaInicio, fechaFin, estado }) => {
  const [result] = await connection.query(
    `INSERT INTO suscripcion (id_usuario, id_plan, fecha_inicio, fecha_fin, estado)
     VALUES (?, ?, ?, ?, ?)`,
    [idUsuario, idPlan, fechaInicio, fechaFin, estado]
  );
  return result.insertId;
};

module.exports = {
  hasActiveSuscripcion,
  insertSuscripcion,
};