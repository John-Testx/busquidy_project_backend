const pool = require("../../db");

/**
 * Queries de estadísticas de empresa
 */

// Obtener total de proyectos de una empresa
const getTotalProjects = async (id_empresa) => {
  const [rows] = await pool.query(
    "SELECT COUNT(*) as total FROM proyecto WHERE id_empresa = ?",
    [id_empresa]
  );
  return rows[0].total;
};

// Obtener proyectos activos de una empresa
const getActiveProjects = async (id_empresa) => {
  const [rows] = await pool.query(
    `SELECT COUNT(*) as total 
     FROM proyecto p
     JOIN publicacion_proyecto pp ON p.id_proyecto = pp.id_proyecto
     WHERE p.id_empresa = ? AND pp.estado_publicacion = 'activo'`,
    [id_empresa]
  );
  return rows[0].total;
};

// Obtener freelancers contratados por una empresa
const getHiredFreelancers = async (id_empresa) => {
  const [rows] = await pool.query(
    `SELECT COUNT(DISTINCT po.id_freelancer) as total
     FROM proyecto p
     JOIN publicacion_proyecto pp ON p.id_proyecto = pp.id_proyecto
     JOIN postulacion po ON pp.id_publicacion = po.id_publicacion
     WHERE p.id_empresa = ? AND po.estado_postulacion = 'contratado'`,
    [id_empresa]
  );
  return rows[0].total;
};

// Obtener todas las estadísticas de empresa
const getEmpresaStats = async (id_empresa) => {
  const totalProjects = await getTotalProjects(id_empresa);
  const activeProjects = await getActiveProjects(id_empresa);
  const hiredFreelancers = await getHiredFreelancers(id_empresa);

  return {
    totalProjects,
    activeProjects,
    hiredFreelancers
  };
};

module.exports = {
  getTotalProjects,
  getActiveProjects,
  getHiredFreelancers,
  getEmpresaStats
};