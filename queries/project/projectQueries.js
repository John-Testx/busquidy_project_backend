const pool = require("../../db");

/**
 * Queries relacionadas con proyectos
 */

// Obtener todos los proyectos con sus publicaciones
const findAllProjectsWithPublications = async () => {
  const [proyectos] = await pool.query(`
    SELECT 
      p.id_proyecto,
      p.id_empresa,
      p.titulo,
      p.categoria,
      p.descripcion,
      pp.fecha_creacion,
      pp.fecha_publicacion,
      pp.estado_publicacion
    FROM proyecto p
    LEFT JOIN publicacion_proyecto pp 
    ON p.id_proyecto = pp.id_proyecto
  `);
  return proyectos;
};

// Obtener proyecto por ID con todos sus detalles
const findProjectById = async (id_proyecto) => {
  const [rows] = await pool.query(`
    SELECT 
      p.id_proyecto,
      p.id_empresa,
      p.titulo,
      p.categoria,
      p.descripcion,
      p.habilidades_requeridas,
      p.presupuesto,
      p.duracion_estimada,
      p.fecha_limite,
      p.ubicacion,
      p.tipo_contratacion,
      p.metodologia_trabajo
    FROM proyecto p
    WHERE p.id_proyecto = ?
    LIMIT 1
  `, [id_proyecto]);
  return rows[0] || null;
};

// Obtener proyectos por id_empresa
const findProjectsByEmpresaId = async (id_empresa) => {
  const [projectResults] = await pool.query(
    "SELECT * FROM proyecto WHERE id_empresa = ?",
    [id_empresa]
  );
  return projectResults;
};

// Insertar nuevo proyecto
const insertProject = async (projectData, id_empresa, connection = pool) => {
  const [result] = await connection.query(
    `INSERT INTO proyecto 
      (id_empresa, titulo, descripcion, categoria, habilidades_requeridas, presupuesto, 
       duracion_estimada, fecha_limite, ubicacion, tipo_contratacion, metodologia_trabajo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id_empresa,
      projectData.titulo,
      projectData.descripcion,
      projectData.categoria,
      projectData.habilidades_requeridas,
      projectData.presupuesto,
      projectData.duracion_estimada,
      projectData.fecha_limite,
      projectData.ubicacion,
      projectData.tipo_contratacion,
      projectData.metodologia_trabajo,
    ]
  );
  return result.insertId;
};

// Actualizar proyecto
const updateProject = async (id_proyecto, projectData) => {
  const [result] = await pool.query(
    `UPDATE proyecto
    SET
      titulo = ?,
      categoria = ?,
      descripcion = ?,
      habilidades_requeridas = ?,
      presupuesto = ?,
      duracion_estimada = ?,
      fecha_limite = ?,
      ubicacion = ?,
      tipo_contratacion = ?,
      metodologia_trabajo = ?
    WHERE id_proyecto = ?`,
    [
      projectData.titulo,
      projectData.categoria,
      projectData.descripcion,
      projectData.habilidades_requeridas,
      projectData.presupuesto,
      projectData.duracion_estimada,
      projectData.fecha_limite,
      projectData.ubicacion,
      projectData.tipo_contratacion,
      projectData.metodologia_trabajo,
      id_proyecto,
    ]
  );
  return result.affectedRows > 0;
};

// Eliminar proyecto
const deleteProject = async (id_proyecto, connection = pool) => {
  const [result] = await connection.query(
    "DELETE FROM proyecto WHERE id_proyecto = ?",
    [id_proyecto]
  );
  return result.affectedRows > 0;
};

// Verificar si existe un proyecto
const existsProject = async (id_proyecto, connection = pool) => {
  const [rows] = await connection.query(
    "SELECT COUNT(*) as count FROM proyecto WHERE id_proyecto = ?",
    [id_proyecto]
  );
  return rows[0].count > 0;
};

// Verificar proyectos duplicados
const checkDuplicateProject = async (id_empresa, projectData) => {
  const [rows] = await pool.query(
    "SELECT * FROM proyecto WHERE id_empresa = ? AND titulo = ?",
    [id_empresa, projectData.titulo]
  );
  return rows;
};

module.exports = {
  findAllProjectsWithPublications,
  findProjectById,
  findProjectsByEmpresaId,
  insertProject,
  updateProject,
  deleteProject,
  existsProject,
  checkDuplicateProject
};