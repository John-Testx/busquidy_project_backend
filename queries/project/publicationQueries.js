const pool = require("../../db");

/**
 * Queries relacionadas con publicaciones de proyectos
 */

// Crear publicación de proyecto
const insertProjectPublication = async (id_proyecto, connection = pool) => {
  await connection.query(
    `INSERT INTO publicacion_proyecto (id_proyecto, fecha_creacion, fecha_publicacion, estado_publicacion)
    VALUES (?, CURDATE(), NULL, 'sin publicar')`,
    [id_proyecto]
  );
};

// Obtener estados de publicación por IDs de proyectos
const findPublicationStatusByProjectIds = async (projectIds) => {
  const [publicationResults] = await pool.query(
    "SELECT id_proyecto, estado_publicacion FROM publicacion_proyecto WHERE id_proyecto IN (?)",
    [projectIds]
  );
  return publicationResults;
};

// Actualizar estado de publicación
const updatePublicationStatus = async (id_proyecto, nuevoEstado) => {
  const [result] = await pool.query(
    "UPDATE publicacion_proyecto SET estado_publicacion = ? WHERE id_proyecto = ?",
    [nuevoEstado, id_proyecto]
  );
  return result.affectedRows > 0;
};

// Eliminar publicación
const deletePublication = async (id_proyecto, connection = pool) => {
  await connection.query(
    "DELETE FROM publicacion_proyecto WHERE id_proyecto = ?",
    [id_proyecto]
  );
};

// Obtener proyectos con publicaciones (detallado)
const findProjectsWithPublicationsDetailed = async () => {
  const [results] = await pool.query(`
    SELECT 
      p.id_proyecto, 
      p.id_empresa, 
      p.titulo, 
      p.tipo,
      p.descripcion, 
      p.categoria, 
      p.habilidades_requeridas, 
      p.presupuesto, 
      p.duracion_estimada, 
      p.fecha_limite, 
      p.ubicacion, 
      p.tipo_contratacion, 
      p.metodologia_trabajo, 
      pub.id_publicacion, 
      pub.fecha_creacion, 
      pub.fecha_publicacion, 
      pub.estado_publicacion
    FROM proyecto p
    LEFT JOIN publicacion_proyecto pub 
    ON p.id_proyecto = pub.id_proyecto
  `);
  return results;
};

module.exports = {
  insertProjectPublication,
  findPublicationStatusByProjectIds,
  updatePublicationStatus,
  deletePublication,
  findProjectsWithPublicationsDetailed
};