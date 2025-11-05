const { Router } = require('express');
const controller = require('../controllers/freelancer/availabilityController');
const { verifyToken } = require('../middlewares/auth');
const router = Router();

// Rutas existentes
router.get('/', verifyToken, controller.getAvailability);
router.post('/', verifyToken, controller.addAvailability);
router.delete('/:id_disponibilidad', verifyToken, controller.deleteAvailability);

// ✅ NUEVA RUTA: Obtener disponibilidad de un freelancer específico (para empresas)
router.get('/freelancer/:id_freelancer', verifyToken, controller.getAvailabilityByFreelancerId);

module.exports = router;