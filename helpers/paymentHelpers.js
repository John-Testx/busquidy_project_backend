/**
 * Helpers para pagos - Funciones auxiliares reutilizables
 */

/**
 * Validar formato de buy order
 * @param {string} buyOrder - Orden de compra
 * @returns {Object} { type: 'PROJECT' | 'SUBSCRIPTION' | 'UNKNOWN', valid: boolean }
 */
const validateBuyOrderFormat = (buyOrder) => {
  if (!buyOrder || typeof buyOrder !== 'string') {
    return { type: 'UNKNOWN', valid: false };
  }

  if (buyOrder.startsWith("BO-")) {
    return { type: 'PROJECT', valid: true };
  }

  if (buyOrder.startsWith("SUB-")) {
    return { type: 'SUBSCRIPTION', valid: true };
  }

  return { type: 'UNKNOWN', valid: false };
};

/**
 * Extraer ID de usuario del sessionId
 * @param {string} sessionId - Session ID
 * @returns {string} ID del usuario
 */
const extractUserIdFromSession = (sessionId) => {
  if (!sessionId) return null;
  return String(sessionId).includes("-") 
    ? sessionId.split("-")[1] 
    : sessionId;
};

/**
 * Formatear respuesta de error estándar
 * @param {string} code - Código del error
 * @param {string} message - Mensaje del error
 * @returns {Object} Objeto de error formateado
 */
const formatErrorResponse = (code, message) => {
  return {
    status: "ERROR",
    error: message,
    code: code || "UNEXPECTED_ERROR",
  };
};

/**
 * Formatear respuesta de éxito para transacción
 * @param {Object} data - Datos de la transacción
 * @returns {Object} Objeto de respuesta formateado
 */
const formatSuccessResponse = (data) => {
  return {
    status: data.status || "SUCCESS",
    token: data.token,
    buyOrder: data.buyOrder,
    amount: data.amount,
    type: data.type,
    ...data.additionalData,
  };
};

/**
 * Formatear fecha a formato YYYY-MM-DD
 * @param {Date} date - Fecha a formatear
 * @returns {string} Fecha formateada
 */
const formatDate = (date) => {
  return date.toISOString().split("T")[0];
};

module.exports = {
  validateBuyOrderFormat,
  extractUserIdFromSession,
  formatErrorResponse,
  formatSuccessResponse,
  formatDate,
};