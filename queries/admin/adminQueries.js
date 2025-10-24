const pool = require("../../db");

/**
 * Queries relacionadas con administradores
 */

// Obtener permisos de un administrador por user ID
const findPermissionsByUserId = async (userId) => {
  const [permissions] = await pool.query(`
    SELECT p.nombre_permiso
    FROM administrador a
    JOIN admin_rol ar ON a.id_administrador = ar.id_administrador
    JOIN rol_permiso rp ON ar.id_rol = rp.id_rol
    JOIN permiso p ON rp.id_permiso = p.id_permiso
    WHERE a.id_usuario = ?
  `, [userId]);
  return permissions;
};

// Obtener roles asignados a un administrador
const findRolesByAdminId = async (adminId) => {
  const [assignedRoles] = await pool.execute(
    "SELECT id_rol FROM admin_rol WHERE id_administrador = ?",
    [adminId]
  );
  return assignedRoles;
};

// Eliminar todos los roles de un administrador
const deleteAdminRoles = async (id_administrador) => {
  await pool.query(
    "DELETE FROM admin_rol WHERE id_administrador = ?",
    [id_administrador]
  );
};

// Asignar roles a un administrador
const assignRolesToAdmin = async (id_administrador, roles) => {
  if (roles && roles.length > 0) {
    const values = roles.map(roleId => [id_administrador, roleId]);
    await pool.query(
      "INSERT INTO admin_rol (id_administrador, id_rol) VALUES ?",
      [values]
    );
  }
};

module.exports = {
  findPermissionsByUserId,
  findRolesByAdminId,
  deleteAdminRoles,
  assignRolesToAdmin
};