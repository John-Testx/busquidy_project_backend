const express = require("express");
const router = express.Router();

// Importar controladores
const {
  register,
  login
} = require("../controllers/user/authController");

const {
  getAllUsers,
  getUserById,
  updateUserStatus,
  updateUserDetails,
  getUsersWithData,
  deleteUser
} = require("../controllers/user/userManagementController");

// ============= RUTAS DE AUTENTICACIÓN =============
router.post("/register", register);
router.post("/login", login);

// ============= RUTAS DE GESTIÓN DE USUARIOS =============
router.get("/", getAllUsers);
router.get("/get/usuarios", getUsersWithData);
router.get("/:id", getUserById);
router.patch("/:id/status", updateUserStatus);
router.patch("/:id", updateUserDetails);
router.delete("/delete/:id_usuario", deleteUser);

module.exports = router;