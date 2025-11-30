const express = require("express");
const router = express.Router();
const passport = require("passport");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL;

// --- Middleware
const { verifyToken } = require("../middlewares/auth");

// --- Controladores ---
const {
  register,
  login,
  forgotPassword, 
  resetPassword,
  completeSocialRegister,
  sendVerificationCode, 
  verifyEmailCode, 
} = require("../controllers/user/authController");

const {
  getAllUsers,
  getUserById,
  updateUserStatus,
  updateUserDetails,
  getUsersWithData,
  deleteUser,
  updateCredentials,
  getUserInfo,
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

// ============= RUTAS DE VERIFICACIÓN DE EMAIL (Públicas) =============
router.post("/send-verification-code", sendVerificationCode);
router.post("/verify-email-code", verifyEmailCode);

// ============= RUTA DE ACTUALIZACIÓN DE CREDENCIALES (Privada) =============
/**
 * PUT /api/users/update-credentials
 * Actualizar email y/o contraseña del usuario logueado
 */
router.put("/update-credentials", verifyToken, updateCredentials);

// ============= RUTAS DE GESTIÓN DE USUARIOS (Para Admin) =============
// (Estas rutas deberían estar protegidas por un middleware de Admin)
router.get("/", getAllUsers);
router.get("/me", verifyToken, getUserInfo);
router.get("/get/usuarios", getUsersWithData);
router.get("/:id", getUserById);
router.patch("/:id/status", updateUserStatus);
router.patch("/:id", updateUserDetails);
router.delete("/delete/:id_usuario", deleteUser);


// ============= RUTAS DE AUTENTICACIÓN SOCIAL (OAuth) =============

// --- GOOGLE ---
// 1. Inicio del flujo: Redirige a Google
router.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

// 2. Callback de Google: Google redirige aquí
router.get(
  "/auth/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: `${FRONTEND_URL}/` }),
  (req, res) => {
    const { user } = req;

    if (user.newUser) {
      const tempToken = jwt.sign(user, JWT_SECRET, { expiresIn: "15m" });
      // Redirige al frontend a la página de "completar registro"
      res.redirect(`${FRONTEND_URL}/auth/complete-profile?token=${tempToken}`);
    } else {
      const token = jwt.sign(
        { id_usuario: user.id_usuario, tipo_usuario: user.tipo_usuario },
        JWT_SECRET,
        { expiresIn: "2h" }
      );
      // Redirige al frontend a una página que guarda el token y redirige
      res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}&email=${user.correo}&tipo_usuario=${user.tipo_usuario}`);
    }
  }
);

// --- RUTAS DE MICROSOFT Y APPLE (similares) ---
// ...

// 3. Finalización de registro social (¡NUEVA RUTA!)
// Esta ruta recibe el tipo_usuario elegido en el frontend
router.post(
  "/auth/complete-social-register",
  require("../middlewares/verifyTempToken"), // Necesitarás un middleware simple
  completeSocialRegister // Función en authController
);

module.exports = router;

