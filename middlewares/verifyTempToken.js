const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware para verificar el token temporal
const verifyTempToken = (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Token no proporcionado" });

    // Verifica el token
    const partialProfile = jwt.verify(token, JWT_SECRET);
    
    // Aseguramos que sea un perfil parcial y no un token de login
    if (!partialProfile.newUser) {
        return res.status(401).json({ error: "Token inválido" });
    }
    
    req.partialProfile = partialProfile; // Adjunta el perfil al request
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
};

module.exports = verifyTempToken;