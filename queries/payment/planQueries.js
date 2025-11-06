const pool = require("../../db");

/**
 * Obtener todos los planes o filtrados por tipo de usuario
 * @param {string|null} tipoUsuario - 'empresa_juridico', 'empresa_natural' o 'freelancer'
 * @returns {Promise<Array>} Lista de planes
 */
const getPlanes = async (tipoUsuario = null) => {
  let query = `
    SELECT 
      id_plan, 
      nombre, 
      precio, 
      tipo_usuario, 
      duracion_dias,
      descripcion,
      beneficios,
      limite_visualizacion_perfiles,
      limite_publicacion_proyectos,
      limite_postulacion_proyectos,
      limite_postulacion_tareas,
      prioridad_recomendacion,
      es_plan_gratuito
    FROM plan
  `;
  const params = [];

  if (tipoUsuario) {
    query += " WHERE tipo_usuario = ?";
    params.push(tipoUsuario);
  }

  query += " ORDER BY precio ASC";

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
    `SELECT 
      id_plan, 
      nombre, 
      duracion_dias, 
      tipo_usuario, 
      precio,
      descripcion,
      beneficios,
      limite_visualizacion_perfiles,
      limite_publicacion_proyectos,
      limite_postulacion_proyectos,
      limite_postulacion_tareas,
      prioridad_recomendacion,
      es_plan_gratuito
    FROM plan 
    WHERE id_plan = ? 
    LIMIT 1`,
    [idPlan]
  );
  return rows.length > 0 ? rows[0] : null;
};

module.exports = {
  getPlanes,
  getPlanById,
};