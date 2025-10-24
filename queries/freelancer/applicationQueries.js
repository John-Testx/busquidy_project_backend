const pool = require("../../db"); require("../../db");

/**
 * Verificar si el freelancer ya aplicó a un proyecto
 */
const checkExistingApplication = async (id_publicacion, id_usuario, connection = pool) => {
  const [applications] = await connection.query(
    `SELECT * FROM postulacion 
     JOIN freelancer ON postulacion.id_freelancer = freelancer.id_freelancer
     WHERE postulacion.id_publicacion = ? AND freelancer.id_usuario = ?`,
    [id_publicacion, id_usuario]
  );
  
  return applications.length > 0;
};

/**
 * Obtener ID del freelancer por ID de usuario
 */
const getFreelancerIdByUserId = async (id_usuario, connection = pool) => {
  const [results] = await connection.query(
    "SELECT id_freelancer FROM freelancer WHERE id_usuario = ?",
    [id_usuario]
  );
  
  return results.length > 0 ? results[0].id_freelancer : null;
};

/**
 * Crear postulación
 */
const createApplication = async (id_publicacion, id_freelancer, connection = pool) => {
  const [result] = await connection.query(
    `INSERT INTO postulacion (id_publicacion, id_freelancer, fecha_postulacion, estado_postulacion)
     VALUES (?, ?, CURDATE(), 'postulado')`,
    [id_publicacion, id_freelancer]
  );
  
  return result.insertId;
};

/**
 * Obtener postulaciones del freelancer
 */
const getFreelancerApplications = async (id_freelancer) => {
  const [postulaciones] = await pool.query(
    `SELECT 
      p.id_postulacion,
      p.fecha_postulacion,
      p.estado_postulacion,
      pr.titulo AS titulo,
      e.nombre_empresa,
      e.correo_empresa,
      e.telefono_contacto,
      pp.fecha_publicacion,
      pp.estado_publicacion
     FROM postulacion AS p
     INNER JOIN publicacion_proyecto AS pp ON p.id_publicacion = pp.id_publicacion
     INNER JOIN proyecto AS pr ON pp.id_proyecto = pr.id_proyecto
     INNER JOIN empresa AS e ON pr.id_empresa = e.id_empresa
     WHERE p.id_freelancer = ?`,
    [id_freelancer]
  );
  
  return postulaciones;
};

/**
 * Verificar si existe una postulación
 */
const checkApplicationExists = async (id_postulacion, connection = pool) => {
  const [results] = await connection.query(
    "SELECT COUNT(*) as count FROM postulacion WHERE id_postulacion = ?",
    [id_postulacion]
  );
  
  return results[0].count > 0;
};

/**
 * Eliminar postulación
 */
const deleteApplication = async (id_postulacion, connection = pool) => {
  const [result] = await connection.query(
    "DELETE FROM postulacion WHERE id_postulacion = ?",
    [id_postulacion]
  );
  
  return result.affectedRows > 0;
};

module.exports = {
  checkExistingApplication,
  getFreelancerIdByUserId,
  createApplication,
  getFreelancerApplications,
  checkApplicationExists,
  deleteApplication
};