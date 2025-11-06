// queries/payment/subscriptionQueries.js
const pool = require("../../db");

/**
 * Obtiene la suscripción activa de un usuario (no solo si existe, sino los datos)
 * @param {number} idUsuario - ID del usuario
 * @param {Object} connection - (Opcional) Conexión de BD existente
 * @returns {Promise<Object|null>} La suscripción activa o null
 */
const getActiveSubscriptionByUserId = async (idUsuario, connection = pool) => {
  const [rows] = await connection.query(
    `SELECT * FROM suscripcion 
     WHERE id_usuario = ? AND estado = 'activa' AND fecha_fin >= CURDATE()
     LIMIT 1`,
    [idUsuario]
  );
  return rows.length > 0 ? rows[0] : null;
};

/**
 * Cancela una suscripción específica por su ID
 * @param {number} idSuscripcion - ID de la suscripción a cancelar
 * @param {Object} connection - (Opcional) Conexión de BD existente
 * @returns {Promise<Object>} Resultado de la actualización
 */
const cancelSubscriptionById = async (idSuscripcion, connection = pool) => {
  const [result] = await connection.query(
    `UPDATE suscripcion 
     SET estado = 'cancelada', fecha_cancelacion = NOW()
     WHERE id_suscripcion = ? AND estado = 'activa'`,
    [idSuscripcion]
  );
  return result;
};

/**
 * Crea un nuevo registro de suscripción
 * @param {number} idUsuario
 * @param {number} idPlan
 * @param {number} monto
 * @param {string} metodoPago
 * @param {string} estado
 * @param {string} fechaInicio (YYYY-MM-DD)
 * @param {string} fechaFin (YYYY-MM-DD)
 * @param {string} token (Opcional, de Webpay)
 * @param {Object} connection - (Opcional) Conexión de BD existente
 * @returns {Promise<number>} ID de la suscripción insertada
 */
const createSubscription = async (
  idUsuario,
  idPlan,
  monto,
  metodoPago,
  estado,
  fechaInicio,
  fechaFin,
  token,
  connection = pool
) => {
  const [result] = await connection.query(
    `INSERT INTO suscripcion 
     (id_usuario, id_plan, fecha_inicio, fecha_fin, estado, monto_pagado, metodo_pago, token_transaccion)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      idUsuario,
      idPlan,
      fechaInicio,
      fechaFin,
      estado,
      monto,
      metodoPago,
      token,
    ]
  );
  return result.insertId;
};

/**
 * Obtiene el plan de una suscripción
 * @param {number} idSuscripcion
 * @param {Object} connection
 * @returns {Promise<Object>}
 */
const getPlanBySubscriptionId = async (idSuscripcion, connection = pool) => {
    const [rows] = await connection.query(
        `SELECT p.* FROM plan p
         JOIN suscripcion s ON p.id_plan = s.id_plan
         WHERE s.id_suscripcion = ?`,
        [idSuscripcion]
    );
    return rows.length > 0 ? rows[0] : null;
};


module.exports = {
  getActiveSubscriptionByUserId,
  cancelSubscriptionById,
  createSubscription,
  getPlanBySubscriptionId,
  // Mantenemos la tuya por si se usa en otro lado, aunque getActiveSubscriptionByUserId es mejor
  hasActiveSuscripcion: async (connection, idUsuario) => {
    const sub = await getActiveSubscriptionByUserId(idUsuario, connection);
    return !!sub;
  }
};