const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/auth"); // <- Asegúrate de importar auth

// Importar controladores
const {
  getAdminPermissions
} = require("../controllers/admin/permissionController");

const {
  getAllRoles,
  createRole,
  updateRole,
  deleteRole
} = require("../controllers/admin/roleController");

const {
  getAdminRoles,
  updateAdminRoles
} = require("../controllers/admin/adminRoleController");

const {
  getDisputedProjects,
  refundProjectPayment
} = require("../controllers/admin/disputeController");

const {
  getPendingVerifications,
  getUserVerificationDetails,
  approveUser,
  rejectUser,
} = require("../controllers/admin/adminVerificationController");

// ============= RUTAS DE PERMISOS =============
router.get("/permissions/:userId", getAdminPermissions);

// ============= RUTAS DE ROLES =============
router.get("/role/get", getAllRoles);
router.post("/role/create", createRole);
router.put("/role/:id", updateRole);
router.delete("/role/:id", deleteRole);

// ============= RUTAS DE ASIGNACIÓN DE ROLES A ADMINS =============
router.get("/roles/:adminId", getAdminRoles);
router.patch("/:id/roles", updateAdminRoles);

// ============= RUTAS DE DISPUTAS Y REEMBOLSOS (NUEVO) =============
router.get("/disputes/projects", verifyToken, getDisputedProjects);
router.post("/disputes/refund/:id_proyecto", verifyToken, refundProjectPayment);

// (Añadir al router de admin, protegido por admin auth)
router.get('/verificaciones/pendientes', getPendingVerifications);
router.get('/verificaciones/usuario/:id', getUserVerificationDetails);
router.post('/verificaciones/aprobar', approveUser);
router.post('/verificaciones/rechazar', rejectUser);

module.exports = router;