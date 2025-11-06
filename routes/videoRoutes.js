// backend/routes/videoRoutes.js
const express = require('express');
const router = express.Router();

// --- CORRECCIÓN DE RUTA ---
// Asegúrate de que coincida con el nombre de tu archivo (probablemente 'videocontroller' en minúscula)
const videoController = require('../controllers/video/videocontroller.js');



// --- Tus rutas de video ---
// Ahora 'authMiddleware' y 'videoController.scheduleCall' deberían ser funciones válidas
router.post('/schedule-call',  videoController.scheduleCall);
router.get('/scheduled-calls',  videoController.getScheduledCalls);
router.post('/create-room',  videoController.createInstantRoom);

module.exports = router;