const pool = require("../../db");

/**
 * Insertar un pago en la tabla pago
 * @param {Object} connection - Conexión de base de datos
 * @param {Object} data - Datos del pago
 * @returns {Promise<number>} ID del pago insertado
 */
const insertPago = async (connection, { idUsuario, monto, estadoPago, metodoPago, referenciaExterna, tipoPago }) => {
  const [result] = await connection.query(
    `INSERT INTO pago (id_usuario, monto, estado_pago, metodo_pago, referencia_externa, tipo_pago, fecha_pago)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [idUsuario, monto, estadoPago, metodoPago, referenciaExterna, tipoPago]
  );
  return result.insertId;
};

/**
 * Insertar detalle de pago de proyecto
 * @param {Object} connection - Conexión de base de datos
 * @param {number} idPago - ID del pago
 * @param {number} idProyecto - ID del proyecto
 */
const insertPagoDetalleProyecto = async (connection, idPago, idProyecto) => {
  await connection.query(
    `INSERT INTO pago_detalle_proyecto (id_pago, id_proyecto) VALUES (?, ?)`,
    [idPago, idProyecto]
  );
};

/**
 * Insertar detalle de pago de suscripción
 * @param {Object} connection - Conexión de base de datos
 * @param {number} idPago - ID del pago
 * @param {number} idSuscripcion - ID de la suscripción
 */
const insertPagoDetalleSuscripcion = async (connection, idPago, idSuscripcion) => {
  await connection.query(
    `INSERT INTO pago_detalle_suscripcion (id_pago, id_suscripcion) VALUES (?, ?)`,
    [idPago, idSuscripcion]
  );
};

/**
 * Obtener historial de pagos de proyectos
 * @returns {Promise<Array>} Lista de pagos de proyectos
 */
const getPagosProyectos = async () => {
  const [rows] = await pool.query(`
    SELECT
      p.id_pago,
      p.id_usuario,
      p.monto,
      p.fecha_pago,
      p.estado_pago,
      p.metodo_pago,
      p.referencia_externa AS referencia_pago,
      p.tipo_pago,
      pdp.id_proyecto,
      pr.titulo AS nombre_proyecto,
      pr.descripcion AS descripcion_proyecto,
      pr.categoria,
      pr.presupuesto,
      pr.duracion_estimada,
      pr.ubicacion,
      pr.tipo_contratacion,
      pr.metodologia_trabajo,
      pp.fecha_creacion,
      pp.fecha_publicacion,
      pp.estado_publicacion,
      u.correo,
      u.tipo_usuario AS tipo_usuario
    FROM pago p
    INNER JOIN pago_detalle_proyecto pdp ON p.id_pago = pdp.id_pago
    INNER JOIN proyecto pr ON pdp.id_proyecto = pr.id_proyecto
    LEFT JOIN publicacion_proyecto pp ON pr.id_proyecto = pp.id_proyecto
    INNER JOIN usuario u ON p.id_usuario = u.id_usuario
    WHERE p.tipo_pago = 'proyecto'
    ORDER BY p.fecha_pago DESC
  `);
  return rows;
};

/**
 * Obtener historial de pagos de suscripciones
 * @returns {Promise<Array>} Lista de pagos de suscripciones
 */
const getPagosSuscripciones = async () => {
  const [rows] = await pool.query(`
    SELECT
      p.id_pago,
      p.id_usuario,
      p.monto,
      p.fecha_pago,
      p.estado_pago,
      p.metodo_pago,
      p.referencia_externa AS referencia_pago,
      p.tipo_pago,
     
      s.id_suscripcion,
      s.fecha_inicio,
      s.fecha_fin,
      s.estado AS estado_suscripcion,
     
      pl.id_plan,
      pl.nombre AS nombre_plan,
      pl.descripcion AS descripcion_plan,
      pl.duracion_dias,
      pl.precio AS precio_plan,
      pl.tipo_usuario AS tipo_plan_usuario,
     
      u.correo,
      u.tipo_usuario AS tipo_usuario
     
    FROM pago p
    INNER JOIN pago_detalle_suscripcion pds ON p.id_pago = pds.id_pago
    INNER JOIN suscripcion s ON pds.id_suscripcion = s.id_suscripcion
    INNER JOIN plan pl ON s.id_plan = pl.id_plan
    INNER JOIN usuario u ON p.id_usuario = u.id_usuario
    WHERE p.tipo_pago = 'suscripcion'
    ORDER BY p.fecha_pago DESC
  `);
  return rows;
};

// =====================================================
// NUEVAS FUNCIONES PARA CONTROL DE TRANSACCIONES WEBPAY
// =====================================================

/**
 * Guarda los metadatos de una transacción de Webpay (antes de confirmar)
 * @param {Object} transactionData - Datos de la transacción
 * @returns {Promise<number>} ID de la transacción insertada
 */
const saveWebpayTransaction = async (transactionData) => {
  const {
    token,
    buyOrder,
    sessionId,
    amount,
    projectId = null,
    companyId = null,
    planId = null,
    tipoUsuario = null,
    metodoPago = 'Webpay',
    paymentType,
  } = transactionData;

  const query = `
    INSERT INTO transacciones_webpay 
    (token, buy_order, session_id, amount, project_id, company_id, plan_id, tipo_usuario, metodo_pago, payment_type, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
  `;

  const [result] = await pool.query(query, [
    token,
    buyOrder,
    sessionId,
    amount,
    projectId,
    companyId,
    planId,
    tipoUsuario,
    metodoPago,
    paymentType,
  ]);

  return result.insertId;
};

/**
 * Obtiene una transacción de Webpay por su token
 * @param {string} token - Token de la transacción
 * @returns {Promise<Object|null>} Datos de la transacción o null
 */
const getWebpayTransactionByToken = async (token) => {
  const query = `
    SELECT * FROM transacciones_webpay 
    WHERE token = ?
    LIMIT 1
  `;

  const [rows] = await pool.query(query, [token]);
  return rows[0] || null;
};

/**
 * Actualiza el estado de una transacción de Webpay
 * @param {string} token - Token de la transacción
 * @param {string} status - Nuevo estado (PENDING, PROCESSING, APPROVED, REJECTED, ERROR)
 * @param {number} responseCode - Código de respuesta de Webpay (opcional)
 * @returns {Promise<boolean>} true si se actualizó correctamente
 */
const updateWebpayTransactionStatus = async (token, status, responseCode = null) => {
  const query = `
    UPDATE transacciones_webpay 
    SET status = ?, response_code = ?, updated_at = NOW()
    WHERE token = ?
  `;

  const [result] = await pool.query(query, [status, responseCode, token]);
  return result.affectedRows > 0;
};

/**
 * Verifica si una transacción de Webpay ya fue procesada
 * @param {string} token - Token de la transacción
 * @returns {Promise<boolean>} true si ya fue procesada
 */
const isWebpayTransactionProcessed = async (token) => {
  const transaction = await getWebpayTransactionByToken(token);
  
  if (!transaction) return false;
  
  // Una transacción está procesada si está en estado final o en proceso
  return ['APPROVED', 'REJECTED', 'PROCESSING'].includes(transaction.status);
};

/**
 * Obtiene el projectId asociado a una transacción de Webpay
 * @param {string} token - Token de la transacción
 * @returns {Promise<number|null>} ID del proyecto o null
 */
const getProjectIdFromWebpayTransaction = async (token) => {
  const transaction = await getWebpayTransactionByToken(token);
  return transaction?.project_id || null;
};

/**
 * Obtiene el planId asociado a una transacción de Webpay
 * @param {string} token - Token de la transacción
 * @returns {Promise<number|null>} ID del plan o null
 */
const getPlanIdFromWebpayTransaction = async (token) => {
  const transaction = await getWebpayTransactionByToken(token);
  return transaction?.plan_id || null;
};

/**
 * Obtener transacciones del usuario según su rol
 * @param {number} userId - ID del usuario
 * @param {string} userRole - Rol del usuario
 * @returns {Promise<Array>} Lista de transacciones
 */
const fetchTransactionsByUserId = async (userId, userRole) => {
  let query = `
    SELECT 
      p.id_pago,
      p.monto,
      p.tipo_pago,
      p.estado_pago,
      p.fecha_pago,
      p.metodo_pago,
      p.referencia_externa,
      -- Datos de proyecto (si aplica)
      pdp.id_proyecto,
      pr.titulo as proyecto_titulo,
      -- Datos de suscripción (si aplica)
      pds.id_suscripcion,
      s.fecha_inicio as suscripcion_inicio,
      s.fecha_fin as suscripcion_fin,
      pl.nombre as plan_nombre
    FROM pago p
    LEFT JOIN pago_detalle_proyecto pdp ON p.id_pago = pdp.id_pago
    LEFT JOIN proyecto pr ON pdp.id_proyecto = pr.id_proyecto
    LEFT JOIN pago_detalle_suscripcion pds ON p.id_pago = pds.id_pago
    LEFT JOIN suscripcion s ON pds.id_suscripcion = s.id_suscripcion
    LEFT JOIN plan pl ON s.id_plan = pl.id_plan
    WHERE p.id_usuario = ?
  `;

  const params = [userId];

  // Filtrar por tipo de pago según el rol
  if (userRole === "freelancer") {
    query += " AND p.tipo_pago = 'suscripcion'";
  } else if (userRole === "empresa_juridico" || userRole === "empresa_natural") {
    query += " AND p.tipo_pago IN ('suscripcion', 'proyecto', 'liberacion_pago')";
  }

  query += " ORDER BY p.fecha_pago DESC";

  const [rows] = await pool.query(query, params);
  return rows;
};

module.exports = {
  // Funciones existentes
  insertPago,
  insertPagoDetalleProyecto,
  insertPagoDetalleSuscripcion,
  getPagosProyectos,
  getPagosSuscripciones,
  
  // Nuevas funciones para Webpay
  saveWebpayTransaction,
  getWebpayTransactionByToken,
  updateWebpayTransactionStatus,
  isWebpayTransactionProcessed,
  getProjectIdFromWebpayTransaction,
  getPlanIdFromWebpayTransaction,
  fetchTransactionsByUserId,
};