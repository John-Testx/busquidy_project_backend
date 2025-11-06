const pool = require("../../db");

/**
 * Queries básicas de usuarios
 */

// ==================== CONSULTAS DE LECTURA ====================

/**
 * Obtener todos los usuarios con información de roles
 */
const findAllUsersWithRoles = async () => {
  const [users] = await pool.query(`
    SELECT u.id_usuario, u.correo, u.tipo_usuario, u.is_active, u.rol_usuario,
           r.nombre_rol AS rol_nombre
    FROM usuario u
    LEFT JOIN rol r ON u.rol_usuario = r.id_rol
  `);
  return users;
};

/**
 * Obtener todos los usuarios (sin roles)
 */
const findAllUsers = async () => {
  const [usuarios] = await pool.query("SELECT * FROM usuario");
  return usuarios;
};

/**
 * Obtener usuario por ID
 * @param {number} id_usuario - ID del usuario
 * @returns {Promise<Array>} Array con datos del usuario
 */
const findUserById = async (id_usuario) => {
  const [rows] = await pool.query(
    "SELECT * FROM usuario WHERE id_usuario = ?",
    [id_usuario]
  );
  return rows;
};

/**
 * Obtener usuario por ID (alias para compatibilidad)
 */
const getUserById = async (id_usuario) => {
  return await findUserById(id_usuario);
};

/**
 * Obtener usuario por correo
 */
const findUserByEmail = async (correo) => {
  const [rows] = await pool.query(
    "SELECT * FROM usuario WHERE correo = ?",
    [correo]
  );
  return rows;
};

/**
 * Obtener tipo de usuario
 */
const findUserType = async (id_usuario) => {
  const [rows] = await pool.query(
    "SELECT tipo_usuario FROM usuario WHERE id_usuario = ?",
    [id_usuario]
  );
  return rows.length > 0 ? rows[0].tipo_usuario : null;
};

/**
 * Verificar si existe usuario por correo
 */
const existsUserByEmail = async (correo) => {
  const [rows] = await pool.query(
    "SELECT COUNT(*) as count FROM usuario WHERE correo = ?",
    [correo]
  );
  return rows[0].count > 0;
};

// ==================== OPERACIONES DE ESCRITURA ====================

/**
 * Crear nuevo usuario
 * @param {string} correo - Correo del usuario
 * @param {string} hashedPassword - Contraseña hasheada
 * @param {string} tipo_usuario - Tipo de usuario (empresa, freelancer, admin)
 * @param {Object} connection - Conexión de base de datos (opcional)
 * @returns {Promise<number>} ID del usuario insertado
 */
const insertUser = async (correo, hashedPassword, tipo_usuario, connection = pool) => {
  const [result] = await connection.query(
    "INSERT INTO usuario (correo, contraseña, tipo_usuario) VALUES (?, ?, ?)",
    [correo, hashedPassword, tipo_usuario]
  );
  return result.insertId;
};

/**
 * Insertar un usuario (alias para compatibilidad con código antiguo)
 */
const insertarUsuario = async (correo, hashedPassword, tipo_usuario) => {
  return await insertUser(correo, hashedPassword, tipo_usuario);
};

/**
 * Actualizar estado de usuario
 */
const updateUserStatus = async (id_usuario, is_active) => {
  const [result] = await pool.query(
    "UPDATE usuario SET is_active = ? WHERE id_usuario = ?",
    [is_active, id_usuario]
  );
  return result.affectedRows > 0;
};

/**
 * Actualizar detalles de usuario
 */
const updateUserDetails = async (id_usuario, correo, rol_usuario, tipo_usuario) => {
  const [result] = await pool.query(
    "UPDATE usuario SET correo = ?, rol_usuario = ?, tipo_usuario = ? WHERE id_usuario = ?",
    [correo, rol_usuario, tipo_usuario, id_usuario]
  );
  return result.affectedRows > 0;
};

/**
 * Actualizar contraseña de usuario
 */
const updateUserPassword = async (id_usuario, hashedPassword) => {
  const [result] = await pool.query(
    "UPDATE usuario SET contraseña = ? WHERE id_usuario = ?",
    [hashedPassword, id_usuario]
  );
  return result.affectedRows > 0;
};

/**
 * Actualizar correo de usuario
 */
const updateUserEmail = async (id_usuario, correo) => {
  const [result] = await pool.query(
    "UPDATE usuario SET correo = ? WHERE id_usuario = ?",
    [correo, id_usuario]
  );
  return result.affectedRows > 0;
};

/**
 * Actualizar último login
 */
const updateLastLogin = async (id_usuario) => {
  try {
    const [result] = await pool.query(
      "UPDATE usuario SET ultimo_login = NOW() WHERE id_usuario = ?",
      [id_usuario]
    );
    return result.affectedRows > 0;
  } catch (error) {
    console.error("Error al actualizar último login:", error);
    return false;
  }
};

/**
 * Eliminar usuario
 */
const deleteUserById = async (id_usuario) => {
  const [result] = await pool.query(
    "DELETE FROM usuario WHERE id_usuario = ?",
    [id_usuario]
  );
  return result.affectedRows > 0;
};

/**
 * Guarda el token de reseteo de contraseña
 * @param {string} correo - Correo del usuario
 * @param {string} hashedToken - Token hasheado
 * @param {Date} expiresAt - Fecha de expiración
 */
const saveResetToken = async (correo, hashedToken, expiresAt) => {
  const query = `
    UPDATE usuario 
    SET reset_token = ?, reset_token_expires = ?
    WHERE correo = ?
  `;
  const [result] = await pool.query(query, [hashedToken, expiresAt, correo]);
  return result;
};

/**
 * Busca un usuario por su token de reseteo
 * @param {string} hashedToken - Token hasheado
 * @returns {Promise<Object|null>} Usuario encontrado o null
 */
const findUserByResetToken = async (hashedToken) => {
  const query = `
    SELECT id_usuario, correo, reset_token_expires 
    FROM usuario 
    WHERE reset_token = ? AND reset_token_expires > NOW()
  `;
  const [result] = await pool.query(query, [hashedToken]);
  return result[0] || null;
};

/**
 * Actualiza la contraseña y limpia el token de reseteo
 * @param {number} id_usuario - ID del usuario
 * @param {string} hashedPassword - Nueva contraseña hasheada
 */
const updatePasswordAndClearToken = async (id_usuario, hashedPassword) => {
  const query = `
    UPDATE usuario 
    SET contraseña = ?, reset_token = NULL, reset_token_expires = NULL
    WHERE id_usuario = ?
  `;
  const [result] = await pool.query(query, [hashedPassword, id_usuario]);
  return result;
};


/**
 * Obtener usuario por ID de proveedor (ej. Google)
 */
const findUserByProviderId = async (provider, providerId) => {
  // Usamos ${} de forma segura aquí porque 'provider' es un valor controlado internamente (ej. "google_id")
  const [rows] = await pool.query(
    `SELECT * FROM usuario WHERE ${provider} = ?`,
    [providerId]
  );
  return rows[0] || null;
};

/**
 * Vincula una cuenta de proveedor a un usuario existente por correo
 */
const linkProviderToUser = async (id_usuario, provider, providerId) => {
  const [result] = await pool.query(
    `UPDATE usuario SET ${provider} = ? WHERE id_usuario = ?`,
    [providerId, id_usuario]
  );
  return result.affectedRows > 0;
};

/**
 * Crear nuevo usuario social (sin contraseña)
 */
const insertSocialUser = async (correo, tipo_usuario, provider, providerId, connection = pool) => {
  const [result] = await connection.query(
    `INSERT INTO usuario (correo, tipo_usuario, ${provider}) VALUES (?, ?, ?)`,
    [correo, tipo_usuario, providerId]
  );
  return result.insertId;
};

/**
 * Guarda el token de verificación de email para subida de documentos
 * @param {number} id_usuario - ID del usuario
 * @param {string} hashedToken - Token hasheado
 * @param {Date} expiresAt - Fecha de expiración
 */
const saveVerificationToken = async (id_usuario, hashedToken, expiresAt) => {
  const query = `
    UPDATE usuario 
    SET verification_token = ?, verification_token_expires = ?
    WHERE id_usuario = ?
  `;
  const [result] = await pool.query(query, [hashedToken, expiresAt, id_usuario]);
  return result;
};

/**
 * Busca un usuario por su token de verificación
 * @param {string} hashedToken - Token hasheado
 * @returns {Promise<Object|null>} Usuario encontrado o null
 */
const findUserByVerificationToken = async (hashedToken) => {
  const query = `
    SELECT id_usuario, correo, tipo_usuario, verification_token_expires 
    FROM usuario 
    WHERE verification_token = ? AND verification_token_expires > NOW()
  `;
  const [result] = await pool.query(query, [hashedToken]);
  return result[0] || null;
};

/**
 * Actualiza el estado de verificación del usuario
 * @param {number} id_usuario - ID del usuario
 * @param {string} estado - Estado de verificación ('no_verificado', 'en_revision', 'verificado', 'rechazado')
 */
const updateVerificationStatus = async (id_usuario, estado) => {
  const query = `
    UPDATE usuario 
    SET estado_verificacion = ?
    WHERE id_usuario = ?
  `;
  const [result] = await pool.query(query, [estado, id_usuario]);
  return result.affectedRows > 0;
};

/**
 * Marca el usuario como verificado y activa la cuenta
 * @param {number} id_usuario - ID del usuario
 */
const markUserAsVerified = async (id_usuario) => {
  const query = `
    UPDATE usuario 
    SET estado_verificacion = 'verificado', 
        is_active = TRUE,
        verification_token = NULL, 
        verification_token_expires = NULL
    WHERE id_usuario = ?
  `;
  const [result] = await pool.query(query, [id_usuario]);
  return result;
};

module.exports = {
  // Consultas de lectura
  findAllUsersWithRoles,
  findAllUsers,
  findUserById,
  getUserById, // Alias para compatibilidad
  findUserByEmail,
  findUserType,
  existsUserByEmail,
  
  // Operaciones de escritura
  insertUser,
  insertarUsuario, // Alias para compatibilidad
  updateUserStatus,
  updateUserDetails,
  updateUserPassword,
  updateUserEmail,
  updateLastLogin,
  deleteUserById,
  saveResetToken,
  findUserByResetToken,
  updatePasswordAndClearToken,

  findUserByProviderId,
  linkProviderToUser,
  insertSocialUser,

  saveVerificationToken,
  findUserByVerificationToken,
  updateVerificationStatus,
  markUserAsVerified,
};