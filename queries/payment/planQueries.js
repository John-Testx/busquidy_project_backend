const pool = require("../../db");

/**
 * Obtener todos los planes o filtrados por tipo de usuario
 * @param {string|null} tipoUsuario - 'empresa' o 'freelancer'
 * @returns {Promise<Array>} Lista de planes
 */
const getPlanes = async (tipoUsuario = null) => {
  let query = "SELECT id_plan, nombre, precio, tipo_usuario, duracion_dias FROM plan";
  const params = [];

  if (tipoUsuario) {
    query += " WHERE tipo_usuario = ?";
    params.push(tipoUsuario);
  }

  const [rows] = await pool.query(query, params);
  return rows;
};

/**
 * Obtener un plan por su ID
 * @param {number} idPlan - ID del plan
 * @returns {Promise<Object|null>} Plan encontrado o null
 */
const getPlanById = async (idPlan) => {
  const [rows] = await pool.query(
    "SELECT id_plan, nombre, duracion_dias, tipo_usuario, precio FROM plan WHERE id_plan = ? LIMIT 1",
    [idPlan]
  );
  return rows.length > 0 ? rows[0] : null;
};

module.exports = {
  getPlanes,
  getPlanById,
};