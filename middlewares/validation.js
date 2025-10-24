const pool = require("../../db"); = require("../../db"); = require("../db");

/**
 * Middleware para validar que el usuario existe en BD
 */
const validateUser = async (req, res, next) => {
  const { id_usuario } = req.params;
  
  try {
    const [usuario] = await pool.query(
      "SELECT * FROM usuario WHERE id_usuario = ?", 
      [id_usuario]
    );
    
    if (usuario.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    
    req.usuario = usuario[0];
    next();
  } catch (error) {
    console.error("Error al validar usuario:", error);
    return res.status(500).json({ error: "Error de validación de usuario" });
  }
};

/**
 * Middleware para validar datos de pago
 */
const validatePaymentData = (req, res, next) => {
  const { title, price, quantity, id_usuario, id_proyecto } = req.body;
  
  // Nota: Había un error en tu código original (id_proyecto en lugar de !id_proyecto)
  if (!title || !price || !quantity || !id_usuario || !id_proyecto) {
    return res.status(400).json({ 
      error: "Faltan datos obligatorios para la preferencia de pago" 
    });
  }
  
  if (isNaN(price) || isNaN(quantity)) {
    return res.status(400).json({ 
      error: "El precio y la cantidad deben ser valores numéricos" 
    });
  }
  
  next();
};

module.exports = {
  validateUser,
  validatePaymentData
};