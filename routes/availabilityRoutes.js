const { Router } = require('express');
const controller = require('../controllers/freelancer/availabilityController');
const {  verifyToken } = require('../middlewares/auth'); // Middleware de autenticación

const router = Router();

// Rutas para la disponibilidad del freelancer
// El middleware 'authenticateToken' asegura que solo usuarios logueados puedan acceder.

// GET /api/freelancer/availability -> Obtiene todos los bloques de disponibilidad del freelancer logueado
router.get('/', verifyToken, controller.getAvailability);

// POST /api/freelancer/availability -> Añade un nuevo bloque de disponibilidad
router.post('/', verifyToken, controller.addAvailability);

// DELETE /api/freelancer/availability/:id_disponibilidad -> Elimina un bloque específico
router.delete('/:id_disponibilidad', verifyToken, controller.deleteAvailability);

module.exports = router;