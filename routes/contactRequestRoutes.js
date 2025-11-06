const express = require("express");
const router = express.Router();
const contactRequestController = require("../controllers/contact/contactRequestController");
const { verifyToken } = require("../middlewares/auth");

// Crear solicitud
router.post("/", verifyToken, contactRequestController.crearSolicitud);

// Responder solicitud
router.patch("/:id_solicitud/responder", verifyToken, contactRequestController.responderSolicitud);

// Obtener solicitudes del usuario
router.get("/", verifyToken, contactRequestController.obtenerSolicitudes);

// ✅ NUEVA RUTA: Obtener detalles de una solicitud específica
router.get("/:id_solicitud", verifyToken, contactRequestController.obtenerSolicitudPorId);

module.exports = router;