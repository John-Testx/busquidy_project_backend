const express = require("express");
const router = express.Router();
const contactRequestController = require("../controllers/contact/contactRequestController");
const { verifyToken } = require("../middlewares/auth");

/**
 * Rutas de solicitudes de contacto
 */

// Crear solicitud
router.post("/", verifyToken, contactRequestController.crearSolicitud);

// Responder solicitud
router.patch("/:id_solicitud/responder", verifyToken, contactRequestController.responderSolicitud);

// Obtener solicitudes del usuario
router.get("/", verifyToken, contactRequestController.obtenerSolicitudes);

module.exports = router;