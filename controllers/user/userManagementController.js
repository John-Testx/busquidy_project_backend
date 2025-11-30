const userQueries = require("../../queries/user/userQueries");
const profileQueries = require("../../queries/user/profileQueries");
const bcrypt = require("bcryptjs");
const pool = require("../../db");

/**
 * Controlador de gestión de usuarios
 */

// Obtener todos los usuarios
const getAllUsers = async (req, res) => {
  try {
    const users = await userQueries.findAllUsersWithRoles();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Obtener usuario por ID
const getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await userQueries.findUserById(id);
    if (user.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    res.json(user[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Actualizar estado de usuario
const updateUserStatus = async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;
  try {
    await userQueries.updateUserStatus(id, is_active);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Actualizar detalles de usuario
const updateUserDetails = async (req, res) => {
  const { id } = req.params;
  const { correo, rol_usuario, tipo_usuario } = req.body;
  try {
    await userQueries.updateUserDetails(id, correo, rol_usuario, tipo_usuario);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Obtener usuarios con datos completos
const getUsersWithData = async (req, res) => {
  try {
    const usuarios = await userQueries.findAllUsers();

    if (usuarios.length === 0) {
      return res.status(404).json({ error: "No se encontraron usuarios" });
    }

    const usuariosConDatos = await Promise.all(
      usuarios.map(async (usuario) => {
        // Comprobamos si el tipo de usuario es CUALQUIERA de los tipos de empresa
        const isEmpresa = usuario.tipo_usuario === "empresa_juridico" || usuario.tipo_usuario === "empresa_natural";
        const isFreelancer = usuario.tipo_usuario === "freelancer";

        const empresa = isEmpresa
          ? await profileQueries.findEmpresaByUserId(usuario.id_usuario)
          : null;

        const freelancer = isFreelancer
          ? await profileQueries.findFreelancerByUserId(usuario.id_usuario)
          : null;

        // Procesar datos de rol y premium
        const idRol = isEmpresa
          ? (empresa ? empresa.id_empresa : null)
          : (freelancer ? freelancer.id_freelancer : null);

        const premium = isEmpresa
          ? (empresa && empresa.premium === 1 ? "Sí" : "No")
          : (freelancer && freelancer.premium === 1 ? "Sí" : "No");

        return {
          ...usuario,
          idRol,
          premium,
          empresa,
          freelancer,
        };
      })
    );

    res.json(usuariosConDatos);
  } catch (error) {
    console.error("Error al obtener los usuarios:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// Eliminar usuario
const deleteUser = async (req, res) => {
  // OJO: Tu ruta usa "id_usuario" como parámetro
  const { id_usuario } = req.params; 

  try {
    // 1. Usamos la nueva query que creamos en el Paso 1
    const success = await userQueries.deleteUserById(id_usuario);

    if (success) {
      res.json({ 
        success: true, 
        message: "Usuario eliminado exitosamente" 
      });
    } else {
      res.status(404).json({ error: "Usuario no encontrado" });
    }
  } catch (err) {
    console.error("❌ Error en deleteUser controller:", err);
    
    // Manejo de errores de Clave Foránea (si intentas borrar una empresa con proyectos)
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ 
        error: "No se puede eliminar el usuario. Está referenciado por otros datos (proyectos, postulaciones, etc.)" 
      });
    }
    
    res.status(500).json({ error: "Error interno al eliminar el usuario" });
  }
};

/**
 * Actualizar credenciales de usuario (email y/o contraseña)
 */
const updateCredentials = async (req, res) => {
  const userId = req.user.id_usuario;
  const { currentPassword, newEmail, newPassword } = req.body;

  try {
    // Validar que se haya proporcionado al menos un cambio
    if (!newEmail && !newPassword) {
      return res.status(400).json({ 
        error: "Debes proporcionar al menos un nuevo email o una nueva contraseña" 
      });
    }

    // Validar contraseña actual
    if (!currentPassword) {
      return res.status(400).json({ 
        error: "Debes proporcionar tu contraseña actual" 
      });
    }

    // Verificar que el usuario existe y obtener su contraseña actual
    const user = await userQueries.findUserById(userId);
    if (!user || user.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // Verificar contraseña actual
    const isPasswordValid = await bcrypt.compare(currentPassword, user[0].contraseña);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "La contraseña actual es incorrecta" });
    }

    // Actualizar email si se proporciona
    if (newEmail) {
      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmail)) {
        return res.status(400).json({ error: "El formato del email no es válido" });
      }

      // Verificar que el email no esté en uso por otro usuario
      const existingUser = await userQueries.findUserByEmail(newEmail);
      if (existingUser.length > 0 && existingUser[0].id_usuario !== userId) {
        return res.status(400).json({ error: "Este email ya está en uso" });
      }

      await userQueries.updateUserEmail(userId, newEmail);
    }

    // Actualizar contraseña si se proporciona
    if (newPassword) {
      // Validar longitud de contraseña
      if (newPassword.length < 6) {
        return res.status(400).json({ 
          error: "La nueva contraseña debe tener al menos 6 caracteres" 
        });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await userQueries.updateUserPassword(userId, hashedPassword);
    }

    res.json({ 
      success: true, 
      message: "Credenciales actualizadas exitosamente" 
    });
  } catch (error) {
    console.error("Error al actualizar credenciales:", error);
    res.status(500).json({ error: "Error al actualizar credenciales" });
  }
};

/**
 * GET /api/users/me
 * Obtiene la información del usuario autenticado con datos FRESCOS de la BD
 */
const getUserInfo = async (req, res) => {
  try {
    const userId = req.user.id_usuario; // viene del middleware verifyToken
    
    // ✅ Consultar DIRECTAMENTE la base de datos (datos frescos, no del token)
    const [rows] = await pool.query(
      `SELECT 
        id_usuario, 
        correo, 
        tipo_usuario, 
        estado_verificacion, 
        is_active,
        ultimo_login
      FROM usuario 
      WHERE id_usuario = ?`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const user = rows[0];

    // ✅ Log para debugging
    console.log(`📊 GET /users/me - Usuario ${userId} consultado - Estado: ${user.estado_verificacion}`);

    // Devolver la información fresca del usuario
    res.status(200).json({
      id_usuario: user.id_usuario,
      correo: user.correo,
      tipo_usuario: user.tipo_usuario,
      estado_verificacion: user.estado_verificacion, // ✅ Campo crítico para ProtectedRoute
      is_active: user.is_active,
      ultimo_login: user.ultimo_login
    });

  } catch (error) {
    console.error('❌ Error en getUserInfo:', error);
    res.status(500).json({ error: 'Error al obtener información del usuario' });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUserStatus,
  updateUserDetails,
  getUsersWithData,
  deleteUser,
  updateCredentials,
  getUserInfo,
};