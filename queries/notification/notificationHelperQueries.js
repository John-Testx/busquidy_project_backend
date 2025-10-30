const pool = require("../../db");

/**
 * Queries auxiliares para obtener datos de contexto para notificaciones
 */

/**
 * Obtener nombre de un proyecto por ID
 */
const getProjectNameById = async (id_proyecto) => {
  const [rows] = await pool.query(
    "SELECT titulo as nombre_proyecto FROM proyecto WHERE id_proyecto = ?",
    [id_proyecto]
  );
  return rows.length > 0 ? rows[0].nombre_proyecto : "Proyecto";
};

/**
 * Obtener nombre de empresa por ID de usuario
 */
const getEmpresaNameByUserId = async (id_usuario) => {
  const [rows] = await pool.query(
    `SELECT e.nombre_empresa 
     FROM empresa e 
     WHERE e.id_usuario = ?`,
    [id_usuario]
  );
  return rows.length > 0 ? rows[0].nombre_empresa : "Empresa";
};

/**
 * Obtener nombre de freelancer por ID de usuario
 */
const getFreelancerNameByUserId = async (id_usuario) => {
  const [rows] = await pool.query(
    `SELECT CONCAT(ap.nombres, ' ', ap.apellidos) as nombre_completo
     FROM freelancer f
     INNER JOIN antecedentes_personales ap ON f.id_freelancer = ap.id_freelancer
     WHERE f.id_usuario = ?`,
    [id_usuario]
  );
  return rows.length > 0 ? rows[0].nombre_completo : "Freelancer";
};

/**
 * Obtener id_usuario de un freelancer por id_freelancer
 */
const getUserIdByFreelancerId = async (id_freelancer) => {
  const [rows] = await pool.query(
    "SELECT id_usuario FROM freelancer WHERE id_freelancer = ?",
    [id_freelancer]
  );
  return rows.length > 0 ? rows[0].id_usuario : null;
};

/**
 * Obtener id_usuario de una empresa por id_empresa
 */
const getUserIdByEmpresaId = async (id_empresa) => {
  const [rows] = await pool.query(
    "SELECT id_usuario FROM empresa WHERE id_empresa = ?",
    [id_empresa]
  );
  return rows.length > 0 ? rows[0].id_usuario : null;
};

/**
 * Obtener datos completos de una postulación
 */
const getPostulacionData = async (id_postulacion) => {
  const [rows] = await pool.query(
    `SELECT 
      po.id_postulacion,
      po.id_freelancer,
      po.id_publicacion,
      f.id_usuario as id_usuario_freelancer,
      CONCAT(ap.nombres, ' ', ap.apellidos) as nombre_freelancer,
      p.id_proyecto,
      p.titulo as nombre_proyecto,
      p.id_empresa,
      e.id_usuario as id_usuario_empresa,
      emp.nombre_empresa
     FROM postulacion po
     INNER JOIN freelancer f ON po.id_freelancer = f.id_freelancer
     INNER JOIN antecedentes_personales ap ON f.id_freelancer = ap.id_freelancer
     INNER JOIN publicacion_proyecto pp ON po.id_publicacion = pp.id_publicacion
     INNER JOIN proyecto p ON pp.id_proyecto = p.id_proyecto
     INNER JOIN empresa e ON p.id_empresa = e.id_empresa
     INNER JOIN empresa emp ON e.id_empresa = emp.id_empresa
     WHERE po.id_postulacion = ?`,
    [id_postulacion]
  );
  return rows.length > 0 ? rows[0] : null;
};

/**
 * Obtener datos de una solicitud de contacto
 */
const getSolicitudContactoData = async (id_solicitud) => {
  const [rows] = await pool.query(
    `SELECT 
      sc.*,
      po.id_freelancer,
      f.id_usuario as id_usuario_freelancer,
      CONCAT(ap.nombres, ' ', ap.apellidos) as nombre_freelancer,
      p.id_proyecto,
      p.titulo as nombre_proyecto,
      emp.nombre_empresa
     FROM solicitudes_contacto sc
     INNER JOIN postulacion po ON sc.id_postulacion = po.id_postulacion
     INNER JOIN freelancer f ON po.id_freelancer = f.id_freelancer
     INNER JOIN antecedentes_personales ap ON f.id_freelancer = ap.id_freelancer
     INNER JOIN publicacion_proyecto pp ON po.id_publicacion = pp.id_publicacion
     INNER JOIN proyecto p ON pp.id_proyecto = p.id_proyecto
     INNER JOIN empresa e ON p.id_empresa = e.id_empresa
     INNER JOIN empresa emp ON e.id_empresa = emp.id_empresa
     WHERE sc.id_solicitud = ?`,
    [id_solicitud]
  );
  return rows.length > 0 ? rows[0] : null;
};

/**
 * Obtener datos de receptor y contexto para una solicitud de contacto recién creada
 * @param {number} id_postulacion - ID de la postulación
 * @param {Object} connection - Conexión de BD (para usar en transacciones)
 * @returns {Promise<Object|null>} Datos del receptor y contexto
 */
const getReceptorDataForContactRequest = async (id_postulacion, connection = pool) => {
  const [rows] = await connection.query(
    `SELECT 
      f.id_usuario as id_usuario_receptor,
      CONCAT(ap.nombres, ' ', ap.apellidos) as nombre_freelancer,
      emp.nombre_empresa,
      p.titulo as nombre_proyecto,
      pp.id_publicacion
     FROM postulacion po
     INNER JOIN freelancer f ON po.id_freelancer = f.id_freelancer
     INNER JOIN antecedentes_personales ap ON f.id_freelancer = ap.id_freelancer
     INNER JOIN publicacion_proyecto pp ON po.id_publicacion = pp.id_publicacion
     INNER JOIN proyecto p ON pp.id_proyecto = p.id_proyecto
     INNER JOIN empresa e ON p.id_empresa = e.id_empresa
     INNER JOIN empresa emp ON e.id_empresa = emp.id_empresa
     WHERE po.id_postulacion = ?`,
    [id_postulacion]
  );
  return rows.length > 0 ? rows[0] : null;
};

module.exports = {
  getProjectNameById,
  getEmpresaNameByUserId,
  getFreelancerNameByUserId,
  getUserIdByFreelancerId,
  getUserIdByEmpresaId,
  getPostulacionData,
  getSolicitudContactoData,
  getReceptorDataForContactRequest,
};