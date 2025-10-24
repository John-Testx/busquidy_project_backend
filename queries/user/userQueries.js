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
};