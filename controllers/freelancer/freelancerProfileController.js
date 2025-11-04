const { getFreelancerByUserId } = require("../../queries/freelancer/profileQueries");
const {getUserById} = require("../../queries/user/userQueries");
const profileQueries = require("../../queries/freelancer/profileQueries");

/**
 * Verificar si existe perfil completo del freelancer
 */
const checkProfileExists = async (req, res) => {
  const { id_usuario } = req.params;

  try {
    // Verificar usuario
    const userCheckResults = await getUserById(id_usuario);
    if (userCheckResults.length === 0) {
      // console.log(`Usuario no encontrado para id: ${id_usuario}`);
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    // console.log("Usuario encontrado, buscando freelancer..."); 

    const freelancerResults = await getFreelancerByUserId(id_usuario);
    if (freelancerResults.length === 0) {
      // console.log(`Freelancer no encontrado para id_usuario: ${id_usuario}`);
      return res.status(404).json({ error: "Freelancer no encontrado" });
    }
    console.log("Freelancer encontrado, verificando perfil completo...");

    const id_freelancer = freelancerResults[0].id_freelancer;

    // Verificar antecedentes personales
    const { exists } = await profileQueries.checkFreelancerProfileExists(id_freelancer);

    res.json({ isPerfilIncompleto: !exists });
  } catch (error) {
    console.error("Error al verificar el perfil del freelancer:", error);
    res.status(500).json({ error: "Error al verificar el perfil del freelancer" });
  }
};

/**
 * Obtener perfil completo (propio)
 */
const getOwnProfile = async (req, res) => {
  const { id_usuario } = req.params;

  if (!id_usuario || isNaN(id_usuario)) {
    return res.status(400).json({ error: "ID de usuario inválido" });
  }

  try {
    // Verificar usuario
    const perfilUsuarioResults = await getUserById(id_usuario);
    if (perfilUsuarioResults.length === 0) {
      return res.status(404).json({ error: "No se encontró el usuario" });
    }

    // Obtener freelancer
    const perfilFreelancerResults = await getFreelancerByUserId(id_usuario);
    if (perfilFreelancerResults.length === 0) {
      return res.status(404).json({ error: "No se encontró el freelancer" });
    }
    
    const id_freelancer = perfilFreelancerResults[0].id_freelancer;

    // Obtener datos completos del perfil
    const profileData = await profileQueries.getCompleteProfileData(id_freelancer);

    // Consolidar respuesta
    res.json({
      usuario: perfilUsuarioResults[0],
      freelancer: perfilFreelancerResults[0],
      ...profileData
    });
  } catch (error) {
    console.error("Error al obtener el perfil del freelancer:", error);
    res.status(500).json({ error: "Error al obtener el perfil del freelancer" });
  }
};

/**
 * Crear perfil completo del freelancer
 */
const createProfile = async (req, res) => {
  const {
    freelancer,
    antecedentes_personales,
    inclusion_laboral,
    emprendimiento,
    trabajo_practica,
    nivel_educacional,
    educacion_superior,
    educacion_basica_media,
    idiomas,
    habilidades,
    curso,
    pretensiones,
    id_usuario
  } = req.body;

  console.log("Datos enviados al backend:", req.body);

  if (!id_usuario) {
    console.log("Error: id_usuario es undefined o null");
    return res.status(400).json({ error: "ID de usuario inválido" });
  }

  try {
    // Verificar usuario
    const userCheckResults = await getUserById(id_usuario);
    if (userCheckResults.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    console.log("Usuario encontrado");

    // Obtener id_freelancer
    const freelancerResults = await getFreelancerByUserId(id_usuario);
    if (freelancerResults.length === 0) {
      return res.status(404).json({ error: "Freelancer no encontrado" });
    }

    const id_freelancer = freelancerResults[0].id_freelancer;
    console.log("ID de freelancer obtenido:", id_freelancer);

    // Actualizar información del freelancer
    await profileQueries.updateFreelancerInfo(id_freelancer, freelancer);

    // Insertar antecedentes personales
    await profileQueries.insertAntecedentesPersonales(id_freelancer, antecedentes_personales);

    // Insertar inclusión laboral
    await profileQueries.insertInclusionLaboral(id_freelancer, inclusion_laboral);

    // Insertar emprendimiento
    await profileQueries.insertEmprendimiento(id_freelancer, emprendimiento);

    // Insertar trabajo/práctica
    await profileQueries.insertTrabajoPractica(id_freelancer, trabajo_practica);

    // Insertar nivel educacional
    await profileQueries.insertNivelEducacional(id_freelancer, nivel_educacional);

    // Insertar educación superior
    await profileQueries.insertEducacionSuperior(id_freelancer, educacion_superior);

    // Insertar educación básica/media
    await profileQueries.insertEducacionBasicaMedia(id_freelancer, educacion_basica_media);

    // Insertar múltiples idiomas
    if (idiomas && idiomas.length > 0) {
      await profileQueries.insertIdiomas(id_freelancer, idiomas);
    }

    // Insertar múltiples habilidades
    if (habilidades && habilidades.length > 0) {
      await profileQueries.insertHabilidades(id_freelancer, habilidades);
    }

    // Insertar curso
    await profileQueries.insertCurso(id_freelancer, curso);

    // Insertar pretensiones
    await profileQueries.insertPretensiones(id_freelancer, pretensiones);

    console.log("Perfil freelancer creado exitosamente");
    res.status(201).json({ message: "Perfil de freelancer creado exitosamente" });
  } catch (err) {
    console.error("Error al crear el perfil:", err);
    res.status(500).json({ error: "Error al crear el perfil de freelancer" });
  }
};

/**
 * Actualizar perfil (Legacy - compatibilidad)
 */
const updateProfileLegacy = async (req, res) => {
  const { id } = req.params;
  const { perfilFreelancer, perfilUsuario } = req.body;

  try {
    const pool = require("../../db");
    
    if (perfilFreelancer) {
      await pool.query(
        `UPDATE freelancer SET 
          nombre_completo = ?, 
          habilidades = ?, 
          descripcion = ? 
         WHERE id_usuario = ?`,
        [
          perfilFreelancer.nombre_completo,
          perfilFreelancer.habilidades,
          perfilFreelancer.descripcion,
          id
        ]
      );
    }

    if (perfilUsuario) {
      await pool.query(
        `UPDATE usuario SET correo = ? WHERE id = ?`,
        [perfilUsuario.correo, id]
      );
    }

    res.json({ message: "Perfil de freelancer actualizado correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error actualizando perfil" });
  }
};

/**
 * Subir foto de perfil
 */
const uploadProfilePhoto = async (req, res) => {
  const { id_usuario } = req.params;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: "No se ha proporcionado ninguna imagen." });
  }

  try {
    const photo_url = `/uploads/profile-photos/${file.filename}`;

    // Obtener id_freelancer
    const freelancerResults = await getFreelancerByUserId(id_usuario);
    if (freelancerResults.length === 0) {
      // Limpiar archivo subido
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      return res.status(404).json({ error: "Freelancer no encontrado" });
    }

    const id_freelancer = freelancerResults[0].id_freelancer;

    // Actualizar foto de perfil en la BD
    await profileQueries.updateProfilePhoto(id_freelancer, photo_url);

    return res.status(200).json({
      message: "Foto de perfil actualizada correctamente.",
      photo_url
    });

  } catch (error) {
    console.error("Error al subir la foto de perfil:", error);

    // Limpiar el archivo subido en caso de error
    if (file && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
      } catch (unlinkError) {
        console.error("Error al eliminar archivo:", unlinkError);
      }
    }

    return res.status(500).json({
      error: "Error al subir la foto de perfil.",
      details: error.message,
    });
  }
};

/**
 * Obtener URL de la foto de perfil
 */
const getProfilePhoto = async (req, res) => {
  const { id_usuario } = req.params;

  try {
    const freelancerResults = await getFreelancerByUserId(id_usuario);
    if (freelancerResults.length === 0) {
      return res.status(404).json({ error: "Freelancer no encontrado" });
    }

    const photo_url = freelancerResults[0].photo_url;

    res.status(200).json({ photo_url: photo_url || null });
  } catch (error) {
    console.error("Error al obtener la foto de perfil:", error);
    res.status(500).json({ error: "Error al obtener la foto de perfil" });
  }
};

/**
 * Obtener preferencias del freelancer
 */
const getPreferencias = async (req, res) => {
  const { id_usuario } = req.params;

  try {
    const freelancerResults = await getFreelancerByUserId(id_usuario);
    if (freelancerResults.length === 0) {
      return res.status(404).json({ error: "Freelancer no encontrado" });
    }

    const id_freelancer = freelancerResults[0].id_freelancer;
    const preferencias = await profileQueries.getPreferencias(id_freelancer);

    res.status(200).json({ preferencias });
  } catch (error) {
    console.error("Error al obtener preferencias:", error);
    res.status(500).json({ error: "Error al obtener preferencias" });
  }
};

/**
 * Actualizar preferencias del freelancer
 */
const updatePreferencias = async (req, res) => {
  const { id_usuario } = req.params;
  const { ofertas_empleo, practicas, trabajo_estudiantes } = req.body;

  try {
    const freelancerResults = await getFreelancerByUserId(id_usuario);
    if (freelancerResults.length === 0) {
      return res.status(404).json({ error: "Freelancer no encontrado" });
    }

    const id_freelancer = freelancerResults[0].id_freelancer;
    
    await profileQueries.updatePreferencias(id_freelancer, {
      ofertas_empleo: ofertas_empleo ? 1 : 0,
      practicas: practicas ? 1 : 0,
      trabajo_estudiantes: trabajo_estudiantes ? 1 : 0
    });

    res.status(200).json({ 
      message: "Preferencias actualizadas correctamente",
      preferencias: {
        ofertas_empleo,
        practicas,
        trabajo_estudiantes
      }
    });
  } catch (error) {
    console.error("Error al actualizar preferencias:", error);
    res.status(500).json({ error: "Error al actualizar preferencias" });
  }
};

module.exports = {
  checkProfileExists,
  getOwnProfile,
  createProfile,
  updateProfileLegacy,
  uploadProfilePhoto,
  getProfilePhoto,
  getPreferencias,
  updatePreferencias
};