const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userQueries = require("../../queries/user/userQueries");
const profileQueries = require("../../queries/user/profileQueries");
const crypto = require("crypto");
const { sendPasswordResetEmail } = require("../../services/emailService");

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Controlador de autenticación
 */

// Registro de usuarios
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
    // Comprobamos si el tipo_usuario es CUALQUIERA de los tipos de empresa
    if (tipo_usuario === "empresa_juridico" || tipo_usuario === "empresa_natural") {
      await profileQueries.insertEmpresaProfile(id_usuario);
      res.status(201).json({ message: "Usuario empresa registrado exitosamente" });
    
    // Mantenemos la lógica para freelancer
    } else if (tipo_usuario === "freelancer") {
      await profileQueries.insertFreelancerProfile(id_usuario);
      res.status(201).json({ message: "Usuario freelancer registrado exitosamente" });
    
    // El 'else' ahora capturará 'administrador' o tipos realmente inválidos
    } else {
      res.status(400).json({ error: "Tipo de usuario no válido" });
    }
  } catch (error) {
    console.error("Error en registro:", error.message);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

// Inicio de sesión
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
    // Validar que el correo fue proporcionado
    if (!correo || correo.trim() === '') {
      return res.status(400).json({ error: "El correo electrónico es requerido" });
    }

    // Verificar si el usuario existe
    const result = await userQueries.findUserByEmail(correo);
    
    // Por seguridad, siempre respondemos lo mismo (no revelamos si el email existe)
    if (result.length === 0) {
      console.log(`Intento de reset para email no registrado: ${correo}`);
      return res.status(200).json({ 
        message: "Si el correo está registrado, recibirás un enlace de recuperación" 
      });
    }

    const user = result[0];

    // Verificar que el usuario esté activo
    if (!user.is_active) {
      return res.status(403).json({ 
        error: "Esta cuenta está desactivada. Contacta a soporte." 
      });
    }

    // Generar token seguro (32 bytes = 64 caracteres hex)
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hashear el token antes de guardarlo en la BD
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Establecer expiración de 15 minutos
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Guardar el token hasheado en la BD
    await userQueries.saveResetToken(correo, hashedToken, expiresAt);

    // Enviar el correo con el token SIN hashear
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
    // Validaciones
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

    // Hashear el token recibido para comparar con la BD
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Buscar usuario por token (también verifica que no haya expirado)
    const user = await userQueries.findUserByResetToken(hashedToken);

    if (!user) {
      return res.status(400).json({ 
        error: "Token inválido o expirado. Solicita un nuevo enlace de recuperación." 
      });
    }

    // Hashear la nueva contraseña
    const hashedPassword = await bcrypt.hash(nuevaContraseña, 10);

    // Actualizar la contraseña y limpiar el token
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

module.exports = {
  register,
  login,
  forgotPassword,  
  resetPassword,
};