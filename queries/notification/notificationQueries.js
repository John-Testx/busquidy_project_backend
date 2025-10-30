const pool = require("../../db");

/**
 * Queries para gestionar notificaciones
 */

/**
 * Insertar una nueva notificación
 * @param {Object} data - Datos de la notificación
 * @param {number} data.id_usuario_receptor - ID del usuario que recibe
 * @param {string} data.tipo_notificacion - Tipo de notificación
 * @param {string} data.mensaje - Mensaje de la notificación
 * @param {string|null} data.enlace - Enlace opcional
 * @param {Object} connection - Conexión de BD (opcional)
 * @returns {Promise<number>} ID de la notificación insertada
 */
const insertNotification = async (data, connection = pool) => {
  const { id_usuario_receptor, tipo_notificacion, mensaje, enlace = null } = data;
  
  const [result] = await connection.query(
    `INSERT INTO notificaciones 
     (id_usuario_receptor, tipo_notificacion, mensaje, enlace, leido) 
     VALUES (?, ?, ?, ?, FALSE)`,
    [id_usuario_receptor, tipo_notificacion, mensaje, enlace]
  );
  
  return result.insertId;
};

/**
 * Obtener todas las notificaciones de un usuario
 * @param {number} id_usuario - ID del usuario
 * @param {boolean} solo_no_leidas - Si solo mostrar no leídas
 * @returns {Promise<Array>} Lista de notificaciones
 */
const findNotificationsByUser = async (id_usuario, solo_no_leidas = false) => {
  let query = `
    SELECT 
      id_notificacion,
      tipo_notificacion,
      mensaje,
      enlace,
      leido,
      fecha_creacion
    FROM notificaciones
    WHERE id_usuario_receptor = ?
  `;
  
  if (solo_no_leidas) {
    query += " AND leido = FALSE";
  }
  
  query += " ORDER BY fecha_creacion DESC";
  
  const [rows] = await pool.query(query, [id_usuario]);
  return rows;
};

/**
 * Obtener notificación por ID
 * @param {number} id_notificacion - ID de la notificación
 * @returns {Promise<Object|null>} Datos de la notificación
 */
const findNotificationById = async (id_notificacion) => {
  const [rows] = await pool.query(
    "SELECT * FROM notificaciones WHERE id_notificacion = ?",
    [id_notificacion]
  );
  return rows.length > 0 ? rows[0] : null;
};

/**
 * Marcar notificación como leída
 * @param {number} id_notificacion - ID de la notificación
 * @returns {Promise<boolean>} True si se actualizó
 */
const markAsRead = async (id_notificacion) => {
  const [result] = await pool.query(
    "UPDATE notificaciones SET leido = TRUE WHERE id_notificacion = ?",
    [id_notificacion]
  );
  return result.affectedRows > 0;
};

/**
 * Marcar todas las notificaciones de un usuario como leídas
 * @param {number} id_usuario - ID del usuario
 * @returns {Promise<number>} Número de notificaciones actualizadas
 */
const markAllAsRead = async (id_usuario) => {
  const [result] = await pool.query(
    "UPDATE notificaciones SET leido = TRUE WHERE id_usuario_receptor = ? AND leido = FALSE",
    [id_usuario]
  );
  return result.affectedRows;
};

/**
 * Contar notificaciones no leídas de un usuario
 * @param {number} id_usuario - ID del usuario
 * @returns {Promise<number>} Cantidad de notificaciones no leídas
 */
const countUnreadNotifications = async (id_usuario) => {
  const [rows] = await pool.query(
    "SELECT COUNT(*) as count FROM notificaciones WHERE id_usuario_receptor = ? AND leido = FALSE",
    [id_usuario]
  );
  return rows[0].count;
};

/**
 * Eliminar notificación
 * @param {number} id_notificacion - ID de la notificación
 * @returns {Promise<boolean>} True si se eliminó
 */
const deleteNotification = async (id_notificacion) => {
  const [result] = await pool.query(
    "DELETE FROM notificaciones WHERE id_notificacion = ?",
    [id_notificacion]
  );
  return result.affectedRows > 0;
};

/**
 * Eliminar notificaciones antiguas (opcional para limpieza)
 * @param {number} dias - Días de antigüedad
 * @returns {Promise<number>} Número de notificaciones eliminadas
 */
const deleteOldNotifications = async (dias = 90) => {
  const [result] = await pool.query(
    "DELETE FROM notificaciones WHERE fecha_creacion < DATE_SUB(NOW(), INTERVAL ? DAY)",
    [dias]
  );
  return result.affectedRows;
};

module.exports = {
  insertNotification,
  findNotificationsByUser,
  findNotificationById,
  markAsRead,
  markAllAsRead,
  countUnreadNotifications,
  deleteNotification,
  deleteOldNotifications,
};