const pool = require("../../db");

/**
 * Listar todos los freelancers con información básica
 */
const getAllFreelancers = async () => {
  const query = `
    SELECT 
      f.id_freelancer AS id_freelancer,
      ap.nombres AS nombres,
      ap.apellidos AS apellidos,
      ap.nacionalidad AS nacionalidad,
      ap.ciudad AS ciudad,
      ap.comuna AS comuna,
      f.correo_contacto AS correo_contacto,
      f.telefono_contacto AS telefono_contacto,
      f.calificacion_promedio AS calificacion_promedio,
      f.descripcion AS descripcion
    FROM freelancer AS f
    JOIN antecedentes_personales AS ap ON f.id_freelancer = ap.id_freelancer
  `;
  const [freelancers] = await pool.query(query);
  return freelancers;
};

/**
 * Obtener freelancer por ID
 */
const getFreelancerById = async (id_freelancer) => {
  const [results] = await pool.query(
    "SELECT * FROM freelancer WHERE id_freelancer = ?",
    [id_freelancer]
  );
  
  return results.length > 0 ? results[0] : null;
};

/**
 * Obtener freelancer por ID de usuario
 */
const getFreelancerByUserId = async (id_usuario) => {
  const [results] = await pool.query(
    "SELECT * FROM freelancer WHERE id_usuario = ?",
    [id_usuario]
  );
  
  console.log("getFreelancerByUserId - id_usuario:", id_usuario);
  console.log("getFreelancerByUserId - results:", results);
  
  return results.length > 0 ? results[0] : null;
};

/**
 * Obtener perfil completo público del freelancer
 */
const getPublicProfileData = async (id_freelancer) => {
  const [antecedentes] = await pool.query(
    "SELECT * FROM antecedentes_personales WHERE id_freelancer = ?",
    [id_freelancer]
  );

  const [inclusionLaboral] = await pool.query(
    "SELECT * FROM inclusion_laboral WHERE id_freelancer = ?",
    [id_freelancer]
  );

  const [emprendimiento] = await pool.query(
    "SELECT * FROM emprendimiento WHERE id_freelancer = ?",
    [id_freelancer]
  );

  const [trabajoPractica] = await pool.query(
    "SELECT * FROM trabajo_practica WHERE id_freelancer = ?",
    [id_freelancer]
  );

  const [nivelEducacional] = await pool.query(
    "SELECT * FROM nivel_educacional WHERE id_freelancer = ?",
    [id_freelancer]
  );

  const [educacionSuperior] = await pool.query(
    "SELECT * FROM educacion_superior WHERE id_freelancer = ?",
    [id_freelancer]
  );

  const [educacionBasica] = await pool.query(
    "SELECT * FROM educacion_basica_media WHERE id_freelancer = ?",
    [id_freelancer]
  );

  const [idiomas] = await pool.query(
    "SELECT * FROM idiomas WHERE id_freelancer = ?",
    [id_freelancer]
  );

  const [habilidades] = await pool.query(
    "SELECT * FROM habilidades WHERE id_freelancer = ?",
    [id_freelancer]
  );

  const [cursos] = await pool.query(
    "SELECT * FROM curso WHERE id_freelancer = ?",
    [id_freelancer]
  );

  const [pretensiones] = await pool.query(
    "SELECT * FROM pretensiones WHERE id_freelancer = ?",
    [id_freelancer]
  );

  return {
    antecedentesPersonales: antecedentes[0] || {},
    inclusionLaboral: inclusionLaboral[0] || {},
    emprendimiento: emprendimiento || [],
    trabajoPractica: trabajoPractica || [],
    nivelEducacional: nivelEducacional[0] || {},
    educacionSuperior: educacionSuperior || [],
    educacionBasicaMedia: educacionBasica || [],
    idiomas: idiomas || [],
    habilidades: habilidades || [],
    curso: cursos || [],
    pretensiones: pretensiones[0] || {}
  };
};

module.exports = {
  getAllFreelancers,
  getFreelancerById,
  getFreelancerByUserId,
  getPublicProfileData
};