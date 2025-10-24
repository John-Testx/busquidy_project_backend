const pool = require("../../db");

/**
 * Inserta un nuevo registro en PagosEnGarantia
 */
const insertGarantia = async (connection, { id_proyecto, monto_retenido, id_transaccion_webpay }) => {
  console.log('🔍 [insertGarantia] Ejecutando query...');
  console.log('📊 Parámetros:', { id_proyecto, monto_retenido, id_transaccion_webpay });
  
  try {
    const [result] = await connection.query(
      `INSERT INTO PagosEnGarantia (id_proyecto, monto_retenido, estado, id_transaccion_webpay)
       VALUES (?, ?, 'RETENIDO', ?)`,
      [id_proyecto, monto_retenido, id_transaccion_webpay]
    );
    
    console.log('✅ [insertGarantia] Registro insertado:', result);
    return result.insertId;
  } catch (error) {
    console.error('❌ [insertGarantia] Error en la query:', error);
    throw error;
  }
};

/**
 * Obtiene un pago en garantía por ID de proyecto
 */
const getGarantiaByProjectId = async (id_proyecto) => {
  const [rows] = await pool.query(
    `SELECT * FROM PagosEnGarantia WHERE id_proyecto = ? LIMIT 1`,
    [id_proyecto]
  );
  return rows[0] || null;
};

/**
 * Actualiza el estado de un pago en garantía
 * @param {Object} connection - Conexión de BD (para transacciones)
 * @param {number} id_proyecto - ID del proyecto
 * @param {string} nuevoEstado - Nuevo estado ('LIBERADO', 'REEMBOLSADO', etc.)
 */
const updateGarantiaStatus = async (connection, id_proyecto, nuevoEstado) => {
  const [result] = await connection.query(
    `UPDATE PagosEnGarantia 
     SET estado = ?, fecha_actualizacion = NOW() 
     WHERE id_proyecto = ?`,
    [nuevoEstado, id_proyecto]
  );
  return result.affectedRows > 0;
};

/**
 * Actualiza el estado de un pago en garantía por ID (legacy)
 */
const updateEstadoGarantia = async (id, nuevoEstado) => {
  const [result] = await pool.query(
    `UPDATE PagosEnGarantia SET estado = ?, fecha_actualizacion = NOW() WHERE id = ?`,
    [nuevoEstado, id]
  );
  return result.affectedRows > 0;
};

module.exports = {
  insertGarantia,
  getGarantiaByProjectId,
  updateEstadoGarantia,
  updateGarantiaStatus 
};