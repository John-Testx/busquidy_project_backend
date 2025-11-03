const express = require("express");
const router = express.Router();

// --- Middleware de autenticación (¡IMPORTANTE!) ---
// (Asegúrate de tener este middleware y la ruta correcta)
const { verifyToken } = require("../middlewares/auth");

// --- Controladores ---
const {
  register,
  login,
  forgotPassword, 
  resetPassword,
} = require("../controllers/user/authController");

const {
  getAllUsers,
  getUserById,
  updateUserStatus,
  updateUserDetails,
  getUsersWithData,
  deleteUser,
  updateCredentials,
} = require("../controllers/user/userManagementController");

// ✅ 1. Importar el nuevo controlador de "USO"
const { getUsage } = require("../controllers/user/usageController");


// ============= RUTAS DE AUTENTICACIÓN (Públicas) =============
router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// ============= RUTA DE USO DEL USUARIO (Privada) =============
// ✅ 2. Añadir la nueva ruta de "USO"
// Esta ruta es para que el usuario logueado (freelancer o empresa) vea sus límites.
// ¡DEBE estar protegida por verifyToken!
router.get("/me/usage", verifyToken, getUsage);

// ============= RUTA DE ACTUALIZACIÓN DE CREDENCIALES (Privada) =============
/**
 * PUT /api/users/update-credentials
 * Actualizar email y/o contraseña del usuario logueado
 */
router.put("/update-credentials", verifyToken, updateCredentials);

// ============= RUTAS DE GESTIÓN DE USUARIOS (Para Admin) =============
// (Estas rutas deberían estar protegidas por un middleware de Admin)
router.get("/", getAllUsers);
router.get("/get/usuarios", getUsersWithData);
router.get("/:id", getUserById);
router.patch("/:id/status", updateUserStatus);
router.patch("/:id", updateUserDetails);
router.delete("/delete/:id_usuario", deleteUser);

module.exports = router;

