const express = require("express");
const router = express.Router();

// Importar middlewares
const { verifyToken } = require("../middlewares/auth");

// Importar controllers
const {
  getPerfilEmpresa,
  getEmpresaProfileStatus,
  createEmpresaProfile,
  updateEmpresaProfile
} = require("../controllers/empresa/profileController");

const {
  getEmpresaStatistics
} = require("../controllers/empresa/statisticsController");

const {
  addReview
} = require("../controllers/empresa/reviewController");

// ============================================
// RUTAS DE PERFIL DE EMPRESA
// ============================================

/**
 * GET /api/empresa/get/:id_usuario
 * Verificar si existe perfil completo de empresa
 */
router.get("/get/:id_usuario", getEmpresaProfileStatus);

/**
 * POST /api/empresa/create-perfil-empresa
 * Crear perfil completo de empresa (empresa + representante)
 */
router.post("/create-perfil-empresa", verifyToken, createEmpresaProfile);

/**
 * GET /api/empresa/get/perfil-empresa/:id_usuario
 * Obtener perfil completo (usuario + empresa + representante)
 */
router.get("/get/perfil-empresa/:id_usuario", getPerfilEmpresa);

/**
 * PUT /api/empresa/update/:id
 * Actualizar perfil de empresa (empresa, representante, usuario)
 */
router.put("/update/:id", verifyToken, updateEmpresaProfile);

/**
 * GET /api/empresa/statistics/:id_usuario
 * Obtener estadísticas de la empresa
 */
router.get("/statistics/:id_usuario", verifyToken, getEmpresaStatistics);

// ============================================
// RUTAS DE RESEÑAS
// ============================================

/**
 * POST /api/empresa/reviews
 * Agregar reseña a empresa
 */
router.post("/reviews", verifyToken, addReview);

module.exports = router;