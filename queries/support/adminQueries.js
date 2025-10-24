const pool = require("../../db");

/**
 * Queries relacionadas con administradores en el sistema de soporte
 */

const findAdminIdByUserId = async (id_usuario) => {
  const [adminRows] = await pool.query(
    "SELECT id_administrador FROM administrador WHERE id_usuario = ?",
    [id_usuario]
  );
  return adminRows[0]?.id_administrador || null;
};

module.exports = {
  findAdminIdByUserId
};