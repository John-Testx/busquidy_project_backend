const pool = require("../../db");

/**
 * Queries relacionadas con postulaciones
 */

// Obtener postulaciones por ID de proyecto
const findPostulationsByProjectId = async (id_proyecto) => {
  const [rows] = await pool.query(`
    SELECT 
      po.id_postulacion,
      po.id_publicacion,
      po.id_freelancer,
      po.fecha_postulacion,
      po.estado_postulacion,
      f.id_usuario,
      f.telefono_contacto,
      f.correo_contacto,
      ap.nombres,
      ap.apellidos,
      pr.renta_esperada,
      tp.cargo AS ultimo_cargo,
      tp.empresa AS ultima_empresa,
      es.carrera AS titulo_profesional
    FROM postulacion po
    INNER JOIN publicacion_proyecto pp ON po.id_publicacion = pp.id_publicacion
    INNER JOIN freelancer f ON po.id_freelancer = f.id_freelancer
    INNER JOIN usuario u ON f.id_usuario = u.id_usuario
    LEFT JOIN antecedentes_personales ap ON f.id_freelancer = ap.id_freelancer
    LEFT JOIN pretensiones pr ON f.id_freelancer = pr.id_freelancer
    LEFT JOIN trabajo_practica tp ON f.id_freelancer = tp.id_freelancer
    LEFT JOIN educacion_superior es ON f.id_freelancer = es.id_freelancer
    WHERE pp.id_proyecto = ?
    GROUP BY po.id_postulacion
    ORDER BY po.fecha_postulacion DESC
  `, [id_proyecto]);
  return rows;
};

// Obtener postulaciones por ID de publicación
const findPostulationsByPublicationId = async (id_publicacion) => {
  const [rows] = await pool.query(`
    SELECT 
      po.id_postulacion,
      po.id_publicacion,
      po.id_freelancer,
      po.fecha_postulacion,
      po.estado_postulacion,
      f.id_usuario,
      f.telefono_contacto,
      f.correo_contacto,
      ap.nombres,
      ap.apellidos,
      pr.renta_esperada,
      tp.cargo AS ultimo_cargo,
      tp.empresa AS ultima_empresa,
      es.carrera AS titulo_profesional
    FROM postulacion po
    INNER JOIN freelancer f ON po.id_freelancer = f.id_freelancer
    INNER JOIN usuario u ON f.id_usuario = u.id_usuario
    LEFT JOIN antecedentes_personales ap ON f.id_freelancer = ap.id_freelancer
    LEFT JOIN pretensiones pr ON f.id_freelancer = pr.id_freelancer
    LEFT JOIN trabajo_practica tp ON f.id_freelancer = tp.id_freelancer
    LEFT JOIN educacion_superior es ON f.id_freelancer = es.id_freelancer
    WHERE po.id_publicacion = ?
    GROUP BY po.id_postulacion
    ORDER BY po.fecha_postulacion DESC
  `, [id_publicacion]);
  return rows;
};

module.exports = {
  findPostulationsByProjectId,
  findPostulationsByPublicationId
};