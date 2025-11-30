const pool = require("../../db");

/**
 * Queries de postulaciones
 */

/**
 * Buscar postulaciones por ID de proyecto CON estado de solicitud
 */
const findPostulationsByProjectId = async (id_proyecto) => {
  const [rows] = await pool.query(
    `SELECT 
      p.id_postulacion,
      p.fecha_postulacion,
      p.estado_postulacion,
      p.id_freelancer,
      ap.nombres,
      ap.apellidos,
      f.correo_contacto,
      f.id_usuario,
      f.telefono_contacto,
      
      -- ✅ SUBCONSULTA: Trae solo la carrera más reciente (por año de término)
      (SELECT es.carrera 
       FROM educacion_superior es 
       WHERE es.id_freelancer = f.id_freelancer 
       ORDER BY es.ano_termino DESC, es.id_educacion_superior DESC 
       LIMIT 1) AS titulo_profesional,

      -- ✅ SUBCONSULTA: Trae solo la última empresa donde trabajó
      (SELECT tp.empresa 
       FROM trabajo_practica tp 
       WHERE tp.id_freelancer = f.id_freelancer 
       ORDER BY tp.ano_inicio DESC, tp.id_experiencia DESC 
       LIMIT 1) AS ultima_empresa,

      -- ✅ SUBCONSULTA: Trae solo el último cargo
      (SELECT tp.cargo 
       FROM trabajo_practica tp 
       WHERE tp.id_freelancer = f.id_freelancer 
       ORDER BY tp.ano_inicio DESC, tp.id_experiencia DESC 
       LIMIT 1) AS ultimo_cargo,

      pr.renta_esperada,
      
      -- Verificar si hay solicitud de contacto pendiente (útil para el frontend)
      CASE 
        WHEN sc.id_solicitud IS NOT NULL THEN TRUE 
        ELSE FALSE 
      END AS solicitud_pendiente

    FROM postulacion p
    JOIN publicacion_proyecto pub ON p.id_publicacion = pub.id_publicacion
    JOIN freelancer f ON p.id_freelancer = f.id_freelancer
    LEFT JOIN antecedentes_personales ap ON f.id_freelancer = ap.id_freelancer
    LEFT JOIN pretensiones pr ON f.id_freelancer = pr.id_freelancer
    LEFT JOIN solicitudes_contacto sc ON p.id_postulacion = sc.id_postulacion AND sc.estado_solicitud = 'pendiente'
    
    WHERE pub.id_proyecto = ?
    
    -- Agrupar por postulación para asegurar unicidad (capa de seguridad extra)
    GROUP BY p.id_postulacion 
    ORDER BY p.fecha_postulacion DESC`,
    [id_proyecto]
  );
  return rows;
};

/**
 * Buscar postulaciones por ID de publicación CON estado de solicitud
 */
const findPostulationsByPublicationId = async (id_publicacion) => {
  const [rows] = await pool.query(
    `SELECT 
      p.*,
      f.id_usuario,
      ap.nombres,
      ap.apellidos,
      f.correo_contacto,
      f.telefono_contacto,
      (SELECT es.carrera FROM educacion_superior es WHERE es.id_freelancer = f.id_freelancer ORDER BY es.ano_termino DESC LIMIT 1) AS titulo_profesional,
      (SELECT tp.empresa FROM trabajo_practica tp WHERE tp.id_freelancer = f.id_freelancer ORDER BY tp.ano_inicio DESC LIMIT 1) AS ultima_empresa,
      (SELECT tp.cargo FROM trabajo_practica tp WHERE tp.id_freelancer = f.id_freelancer ORDER BY tp.ano_inicio DESC LIMIT 1) AS ultimo_cargo,
      pr.renta_esperada,
      CASE 
        WHEN sc.id_solicitud IS NOT NULL AND sc.estado_solicitud = 'pendiente' 
        THEN TRUE 
        ELSE FALSE 
      END AS solicitud_pendiente
    FROM postulacion p
    JOIN freelancer f ON p.id_freelancer = f.id_freelancer
    LEFT JOIN antecedentes_personales ap ON f.id_freelancer = ap.id_freelancer
    LEFT JOIN pretensiones pr ON f.id_freelancer = pr.id_freelancer
    LEFT JOIN solicitudes_contacto sc ON p.id_postulacion = sc.id_postulacion AND sc.estado_solicitud = 'pendiente'
    WHERE p.id_publicacion = ?
    GROUP BY p.id_postulacion
    ORDER BY p.fecha_postulacion DESC`,
    [id_publicacion]
  );
  return rows;
};

/**
 * Verificar si un usuario ya postuló a una publicación
 * @param {number} id_usuario - ID del usuario
 * @param {number} id_publicacion - ID de la publicación
 * @returns {Promise<boolean>} true si ya postuló, false si no
 */
const checkIfUserApplied = async (id_usuario, id_publicacion) => {
  const [freelancerRows] = await pool.query(
    `SELECT id_freelancer FROM freelancer WHERE id_usuario = ?`,
    [id_usuario]
  );
  if (freelancerRows.length === 0) {
    return false;
  }
  const id_freelancer = freelancerRows[0].id_freelancer;
  const [rows] = await pool.query(
    `SELECT id_postulacion 
     FROM postulacion 
     WHERE id_freelancer = ? AND id_publicacion = ?`,
    [id_freelancer, id_publicacion]
  );
  return rows.length > 0;
};

/**
 * Crear nueva postulación
 * @param {number} id_usuario - ID del usuario
 * @param {number} id_publicacion - ID de la publicación
 * @returns {Promise<number>} ID de la postulación creada
 */
const createPostulation = async (id_usuario, id_publicacion) => {
  const [freelancerRows] = await pool.query(
    `SELECT id_freelancer FROM freelancer WHERE id_usuario = ?`,
    [id_usuario]
  );
  if (freelancerRows.length === 0) {
    throw new Error('No existe un perfil de freelancer para este usuario. No se puede postular.');
  }
  const id_freelancer = freelancerRows[0].id_freelancer;

  const [existingPostulation] = await pool.query(
    `SELECT id_postulacion 
     FROM postulacion 
     WHERE id_freelancer = ? AND id_publicacion = ?`,
    [id_freelancer, id_publicacion]
  );

  if (existingPostulation.length > 0) {
    throw new Error('Ya has postulado a este proyecto');
  }

  const [result] = await pool.query(
    `INSERT INTO postulacion ( id_publicacion, id_freelancer, fecha_postulacion, estado_postulacion)
     VALUES (?, ?, NOW(), 'pendiente')`,
    [id_publicacion, id_freelancer] 
  );
  return result.insertId;
};

/**
 * Obtener todas las postulaciones de un usuario
 * @param {number} id_usuario - ID del usuario
 * @returns {Promise<Array>} Lista de postulaciones
 */
const findPostulationsByUserId = async (id_usuario) => {
  const [freelancerRows] = await pool.query(
    `SELECT id_freelancer FROM freelancer WHERE id_usuario = ?`,
    [id_usuario]
  );

  if (freelancerRows.length === 0) {
    return []; 
  }
  const id_freelancer = freelancerRows[0].id_freelancer;

  const [rows] = await pool.query(
    `SELECT 
      p.id_postulacion,
      p.id_publicacion,
      p.fecha_postulacion,
      p.estado_postulacion,
      pub.titulo,
      pub.descripcion,
      pub.presupuesto,
      pub.ubicacion,
      pub.duracion_estimada,
      pub.habilidades,
      e.nombre_empresa AS empresa,
      e.calificacion_promedio AS rating
    FROM postulacion p
    INNER JOIN publicacion pub ON p.id_publicacion = pub.id_publicacion
    LEFT JOIN empresa e ON pub.id_usuario = e.id_usuario
    WHERE p.id_freelancer = ?
    ORDER BY p.fecha_postulacion DESC`,
    [id_freelancer]
  );
  return rows;
};

/**
 * Eliminar una postulación
 * @param {number} id_postulacion - ID de la postulación
 * @returns {Promise<boolean>} true si se eliminó correctamente
 */
const deletePostulation = async (id_postulacion) => {
  const [result] = await pool.query(
    `DELETE FROM postulacion WHERE id_postulacion = ?`,
    [id_postulacion]
  );
  return result.affectedRows > 0;
};

module.exports = {
  findPostulationsByProjectId,
  findPostulationsByPublicationId,
  checkIfUserApplied,
  createPostulation,
  findPostulationsByUserId,
  deletePostulation
};