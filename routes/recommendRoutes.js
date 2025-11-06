const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/auth");
const { getFreelancerRecommendations } = require("../controllers/recommend/recommendController");


/**
 * POST /api/recommend/freelancers
 * * Obtiene una lista de perfiles de freelancers recomendados
 * basada en la categoría y habilidades de un proyecto.
 * * Body esperado:
 * {
 * "categoria": "string",
 * "habilidades_requeridas": ["array", "de", "strings"]
 * }
 */
router.post("/freelancers", verifyToken, getFreelancerRecommendations);


module.exports = router;