const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Middleware para verificar JWT obligatorio
 */
const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    
    if (!authHeader) {
      return res.status(401).json({ error: "Acceso denegado" });
    }

    const token = authHeader.split(" ")[1];
    
    if (!token) {
      return res.status(401).json({ error: "Token no proporcionado" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    req.isAuthenticated = true;
    
    next();
  } catch (err) {
    console.error("Error al verificar el token:", err.message);
    return res.status(401).json({ error: "Token inválido" });
  }
};

/**
 * Middleware de autenticación opcional
 * Si hay token lo verifica, si no continúa sin error
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      req.isAuthenticated = false;
      req.user = null;
      return next();
    }
    
    const token = authHeader.split(" ")[1];
    
    if (!token) {
      req.isAuthenticated = false;
      req.user = null;
      return next();
    }
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      req.isAuthenticated = true;
    } catch (err) {
      req.isAuthenticated = false;
      req.user = null;
    }
    
    next();
  } catch (err) {
    console.error("Error en optionalAuth:", err.message);
    req.isAuthenticated = false;
    req.user = null;
    next();
  }
};

module.exports = {
  verifyToken,
  optionalAuth
};