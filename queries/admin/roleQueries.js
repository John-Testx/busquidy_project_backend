const pool = require("../../db");

/**
 * Queries relacionadas con roles
 */

// Obtener todos los roles
const findAllRoles = async () => {
  const [rows] = await pool.query("SELECT * FROM rol");
  return rows;
};

// Obtener rol por ID
const findRoleById = async (id_rol) => {
  const [rows] = await pool.query(
    "SELECT * FROM rol WHERE id_rol = ?",
    [id_rol]
  );
  return rows[0] || null;
};

// Crear nuevo rol
const insertRole = async (nombre_rol, descripcion) => {
  const [result] = await pool.query(
    "INSERT INTO rol (nombre_rol, descripcion) VALUES (?, ?)",
    [nombre_rol, descripcion]
  );
  return result.insertId;
};

// Actualizar rol
const updateRole = async (id_rol, nombre_rol, descripcion) => {
  const [result] = await pool.query(
    "UPDATE rol SET nombre_rol = ?, descripcion = ? WHERE id_rol = ?",
    [nombre_rol, descripcion, id_rol]
  );
  return result.affectedRows > 0;
};

// Eliminar rol
const deleteRole = async (id_rol) => {
  const [result] = await pool.query(
    "DELETE FROM rol WHERE id_rol = ?",
    [id_rol]
  );
  return result.affectedRows > 0;
};

module.exports = {
  findAllRoles,
  findRoleById,
  insertRole,
  updateRole,
  deleteRole
};