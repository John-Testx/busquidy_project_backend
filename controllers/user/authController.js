const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userQueries = require("../../queries/user/userQueries");
const profileQueries = require("../../queries/user/profileQueries");

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
    if (tipo_usuario === "empresa") {
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

module.exports = {
  register,
  login
};