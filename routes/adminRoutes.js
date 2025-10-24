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
} = require("../controllers/admin/disputeController"); // <- NUEVO

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

module.exports = router;