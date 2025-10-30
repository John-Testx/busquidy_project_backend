const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notification/notificationController");
const { verifyToken } = require("../middlewares/auth"); // Ajusta según tu middleware

/**
 * Rutas de notificaciones
 * Todas requieren autenticación
 */

// Obtener todas las notificaciones del usuario
// GET /api/notifications?solo_no_leidas=true
router.get("/", verifyToken, notificationController.obtenerNotificaciones);

// Obtener contador de notificaciones no leídas
// GET /api/notifications/unread/count
router.get("/unread/count", verifyToken, notificationController.obtenerContadorNoLeidas);

// Marcar una notificación como leída
// PATCH /api/notifications/:id_notificacion/read
router.patch("/:id_notificacion/read", verifyToken, notificationController.marcarComoLeida);

// Marcar todas las notificaciones como leídas
// PATCH /api/notifications/read-all
router.patch("/read-all", verifyToken, notificationController.marcarTodasComoLeidas);

// Eliminar una notificación
// DELETE /api/notifications/:id_notificacion
router.delete("/:id_notificacion", verifyToken, notificationController.eliminarNotificacion);

module.exports = router;