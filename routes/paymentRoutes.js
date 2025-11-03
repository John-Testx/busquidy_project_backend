const express = require("express");
const router = express.Router();

// Controllers
const planController = require("../controllers/payment/planController");
const transactionController = require("../controllers/payment/transactionController");
const historyController = require("../controllers/payment/historyController");
const { verifyToken } = require("../middlewares/auth");

// Middlewares (si necesitas agregar autenticación en el futuro)
// const { verifyToken } = require("../middlewares/auth");

// ==================== RUTAS DE PLANES ====================
/**
 * GET /api/payments/plan
 * Obtener todos los planes o filtrados por tipo_usuario
 * Query params: ?tipo_usuario=empresa|freelancer
 */
router.get("/plan", planController.getAllPlanes);

// ==================== RUTAS DE TRANSACCIONES ====================
/**
 * POST /api/payments/create_transaction_suscription
 * Crear transacción de pago para suscripción
 */
router.post("/create_transaction_suscription", transactionController.createSubscriptionTransaction);

/**
 * POST /api/payments/create_transaction_project
 * Crear transacción de pago para publicación de proyecto
 */
router.post("/create_transaction_project", transactionController.createProjectTransaction);

/**
 * POST /api/payments/commit_transaction
 * Confirmar transacción después del pago en Webpay
 */
router.post("/commit_transaction", transactionController.commitTransaction);

// ==================== RUTAS DE HISTORIAL ====================
/**
 * GET /api/payments/pagos-proyectos
 * Obtener historial de pagos de proyectos
 */
router.get("/pagos-proyectos", historyController.getProjectPaymentHistory);

/**
 * GET /api/payments/pagos-suscripciones
 * Obtener historial de pagos de suscripciones
 */
router.get("/pagos-suscripciones", historyController.getSubscriptionPaymentHistory);

// ==================== RUTA DE TRANSACCIONES DEL USUARIO ====================
/**
 * GET /api/payments/my-transactions
 * Obtener transacciones del usuario logueado
 */
router.get("/my-transactions", verifyToken, transactionController.getMyTransactions);

module.exports = router;