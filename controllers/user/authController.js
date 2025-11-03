const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userQueries = require("../../queries/user/userQueries");
const profileQueries = require("../../queries/user/profileQueries");
const crypto = require("crypto");
const { sendPasswordResetEmail, sendEmail } = require("../../services/emailService");
const redisService = require("../../services/redisService"); // ✅ Importar servicio

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Generar y enviar código de verificación
 */
const sendVerificationCode = async (req, res) => {
  const { correo } = req.body;

  try {
    if (!correo || !correo.includes('@')) {
      return res.status(400).json({ error: 'Correo electrónico inválido' });
    }

    const existingUser = await userQueries.findUserByEmail(correo);
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'Este correo ya está registrado' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // ✅ Usar el servicio centralizado
    await redisService.set(`verification:${correo}`, code, 600); // 10 min

    const subject = 'Código de verificación - Busquidy';
    const text = `Tu código de verificación es: ${code}\n\nEste código expira en 10 minutos.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #07767c;">Código de Verificación</h2>
        <p>Tu código de verificación para Busquidy es:</p>
        <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
          ${code}
        </div>
        <p style="color: #666;">Este código expira en 10 minutos.</p>
        <p style="color: #999; font-size: 12px;">Si no solicitaste este código, puedes ignorar este correo.</p>
      </div>
    `;

    await sendEmail(correo, subject, text, html);
    res.status(200).json({ message: 'Código de verificación enviado exitosamente' });

  } catch (error) {
    console.error('Error al enviar código:', error);
    res.status(500).json({ error: 'Error al enviar código de verificación' });
  }
};

/**
 * Verificar código de correo electrónico
 */
const verifyEmailCode = async (req, res) => {
  const { correo, codigo } = req.body;

  try {
    if (!correo || !codigo) {
      return res.status(400).json({ error: 'Correo y código son requeridos' });
    }

    // ✅ Usar el servicio centralizado
    const storedCode = await redisService.get(`verification:${correo}`);

    if (!storedCode) {
      return res.status(400).json({ error: 'Código no encontrado o expirado' });
    }

    if (storedCode !== codigo) {
      return res.status(400).json({ error: 'Código incorrecto' });
    }

    await redisService.delete(`verification:${correo}`);
    res.status(200).json({ message: 'Correo verificado exitosamente' });

  } catch (error) {
    console.error('Error al verificar código:', error);
    res.status(500).json({ error: 'Error al verificar código' });
  }
};

// ============================================
// CONTROLADORES DE AUTENTICACIÓN
// ============================================

/**
 * Registro de usuarios
 */
const register = async (req, res) => {
  const { correo, contraseña, tipo_usuario } = req.body;

  try {
    // Verificar si el correo ya existe
    const existingUser = await userQueries.findUserByEmail(correo);
    if (existingUser.length > 0) {
      return res.status(400).json({ error: "Correo ya registrado" });
    }

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(contraseña, 10);
    console.log("Contraseña hasheada:", hashedPassword);

    // Insertar usuario
    console.log("Correo:", correo, "Tipo de usuario:", tipo_usuario);
    const id_usuario = await userQueries.insertUser(correo, hashedPassword, tipo_usuario);
    console.log("ID Usuario insertado:", id_usuario);

    // Crear perfil dependiendo del tipo de usuario
    if (tipo_usuario === "empresa_juridico" || tipo_usuario === "empresa_natural") {
      await profileQueries.insertEmpresaProfile(id_usuario);
      res.status(201).json({ message: "Usuario empresa registrado exitosamente" });
    } else if (tipo_usuario === "freelancer") {
      await profileQueries.insertFreelancerProfile(id_usuario);
      res.status(201).json({ message: "Usuario freelancer registrado exitosamente" });
    } else {
      res.status(400).json({ error: "Tipo de usuario no válido" });
    }
  } catch (error) {
    console.error("Error en registro:", error.message);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

/**
 * Inicio de sesión
 */
const login = async (req, res) => {
  const { correo, contraseña } = req.body;
  console.log("Correo recibido:", correo);

  try {
    // Verificar si el correo existe
    const result = await userQueries.findUserByEmail(correo);
    if (result.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const user = result[0];
    console.log("Hash almacenado:", user.contraseña);

    // Verificar la contraseña
    const isPasswordValid = await bcrypt.compare(contraseña, user.contraseña);
    console.log("¿Contraseña válida?", isPasswordValid);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    // Actualizar último login
    await userQueries.updateLastLogin(user.id_usuario);

    // Generar token JWT
    const token = jwt.sign(
      { id_usuario: user.id_usuario, tipo_usuario: user.tipo_usuario },
      JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.status(200).json({
      message: "Inicio de sesión exitoso",
      token,
      tipo_usuario: user.tipo_usuario
    });
  } catch (error) {
    console.error("Error en login:", error.message);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

/**
 * Solicita el reseteo de contraseña
 */
const forgotPassword = async (req, res) => {
  const { correo } = req.body;

  try {
    if (!correo || correo.trim() === '') {
      return res.status(400).json({ error: "El correo electrónico es requerido" });
    }

    const result = await userQueries.findUserByEmail(correo);
    
    if (result.length === 0) {
      console.log(`Intento de reset para email no registrado: ${correo}`);
      return res.status(200).json({ 
        message: "Si el correo está registrado, recibirás un enlace de recuperación" 
      });
    }

    const user = result[0];

    if (!user.is_active) {
      return res.status(403).json({ 
        error: "Esta cuenta está desactivada. Contacta a soporte." 
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await userQueries.saveResetToken(correo, hashedToken, expiresAt);
    await sendPasswordResetEmail(correo, resetToken);

    console.log(`✅ Email de recuperación enviado a: ${correo}`);
    
    res.status(200).json({ 
      message: "Si el correo está registrado, recibirás un enlace de recuperación" 
    });

  } catch (error) {
    console.error("Error en forgotPassword:", error.message);
    res.status(500).json({ error: "Error al procesar la solicitud" });
  }
};

/**
 * Resetea la contraseña usando el token
 */
const resetPassword = async (req, res) => {
  const { token, nuevaContraseña } = req.body;

  try {
    if (!token || !nuevaContraseña) {
      return res.status(400).json({ 
        error: "Token y nueva contraseña son requeridos" 
      });
    }

    if (nuevaContraseña.length < 6) {
      return res.status(400).json({ 
        error: "La contraseña debe tener al menos 6 caracteres" 
      });
    }

    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await userQueries.findUserByResetToken(hashedToken);

    if (!user) {
      return res.status(400).json({ 
        error: "Token inválido o expirado. Solicita un nuevo enlace de recuperación." 
      });
    }

    const hashedPassword = await bcrypt.hash(nuevaContraseña, 10);
    await userQueries.updatePasswordAndClearToken(user.id_usuario, hashedPassword);

    console.log(`✅ Contraseña actualizada para usuario ID: ${user.id_usuario}`);

    res.status(200).json({ 
      message: "Contraseña actualizada exitosamente. Ya puedes iniciar sesión." 
    });

  } catch (error) {
    console.error("Error en resetPassword:", error.message);
    res.status(500).json({ error: "Error al resetear la contraseña" });
  }
};

/**
 * Completar registro social
 */
const completeSocialRegister = async (req, res) => {
  const { partialProfile } = req;
  const { tipo_usuario } = req.body;

  try {
    if (!tipo_usuario || !["freelancer", "empresa_juridico", "empresa_natural"].includes(tipo_usuario)) {
      return res.status(400).json({ error: "Tipo de usuario no válido" });
    }

    const existingUser = await userQueries.findUserByEmail(partialProfile.email);
    if (existingUser.length > 0) {
      return res.status(400).json({ error: "Correo ya registrado" });
    }

    const id_usuario = await userQueries.insertSocialUser(
      partialProfile.email,
      tipo_usuario,
      partialProfile.provider,
      partialProfile.providerId
    );
    console.log("ID Usuario social insertado:", id_usuario);

    if (tipo_usuario === "empresa_juridico" || tipo_usuario === "empresa_natural") {
      await profileQueries.insertEmpresaProfile(id_usuario);
    } else if (tipo_usuario === "freelancer") {
      await profileQueries.insertFreelancerProfile(id_usuario);
    }

    const token = jwt.sign(
      { id_usuario: id_usuario, tipo_usuario: tipo_usuario },
      JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.status(201).json({
      message: "Usuario registrado y logueado exitosamente",
      token,
      tipo_usuario: tipo_usuario
    });

  } catch (error) {
    console.error("Error en registro social:", error.message);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

// ============================================
// EXPORTAR MÓDULOS
// ============================================

module.exports = {
  register,
  login,
  forgotPassword,  
  resetPassword,
  completeSocialRegister,
  sendVerificationCode, 
  verifyEmailCode,
};