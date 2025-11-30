const express = require('express');
const router = express.Router();
const contactRequestController = require('../controllers/contact/contactRequestController');
const { verifyToken } = require('../middlewares/auth');

// 1. Crear una nueva solicitud
router.post('/', verifyToken, contactRequestController.createContactRequest);

// 2. Obtener todas las solicitudes del usuario (Lista)
router.get('/', verifyToken, contactRequestController.getContactRequests);

// 3. Obtener UNA solicitud específica por ID (Detalle)
router.get('/:id', verifyToken, contactRequestController.getContactRequestById);

// 4. ✅ ESTA ES LA RUTA QUE FALTA PARA EL ERROR 404
// Responder a una solicitud (Aceptar/Rechazar)
router.patch('/:id/respond/', verifyToken, contactRequestController.respondToRequest);

module.exports = router;