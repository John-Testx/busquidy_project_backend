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

const isEmpresa = (req, res, next) => {
  // Este middleware debe correr DESPUÉS de verifyToken,
  // por lo que ya deberíamos tener req.user
  if (!req.isAuthenticated || !req.user) {
    return res.status(401).json({ error: "Acceso denegado, requiere token" });
  }

  const userRole = req.user.tipo_usuario; // O como se llame el campo de rol en tu JWT
  if (userRole === "empresa_juridico" || userRole === "empresa_natural") {
    // Si el rol es uno de los permitidos, continúa
    next();
  } else {
    // Si no tiene el rol adecuado, deniega el acceso
    console.warn(`Intento de acceso denegado para usuario ${req.user.id_usuario} con rol ${userRole} a ruta de empresa`);
    return res.status(403).json({ error: "Acceso denegado. No tienes permisos de empresa." });
  }
};

module.exports = {
  verifyToken,
  optionalAuth,
  isEmpresa
};