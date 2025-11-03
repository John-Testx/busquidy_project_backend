const postulationQueries = require("../../queries/project/postulationQueries");
const profileQueries = require("../../queries/freelancer/profileQueries");

/**
 * Controlador de postulaciones
 */

/**
 * Obtener postulaciones por ID de proyecto
 */
const getPostulationsByProjectId = async (req, res) => {
  const { id_proyecto } = req.params;

  try {
    const postulations = await postulationQueries.findPostulationsByProjectId(id_proyecto);
    
    const formattedPostulations = postulations.map(post => ({
      id_postulacion: post.id_postulacion,
      id_usuario: post.id_usuario,
      nombre: `${post.nombres || ''} ${post.apellidos || ''}`.trim() || 'Nombre no disponible',
      titulo_profesional: post.titulo_profesional || post.ultimo_cargo || 'Sin título especificado',
      biografia: post.ultima_empresa ? `Última experiencia en ${post.ultima_empresa}` : '',
      tarifa_hora: post.renta_esperada || 0,
      experiencia_anios: 0,
      correo: post.correo_contacto || '',
      telefono: post.telefono_contacto || '',
      fecha_postulacion: post.fecha_postulacion,
      estado_postulacion: post.estado_postulacion
    }));

    res.json(formattedPostulations);
  } catch (error) {
    console.error("Error al obtener postulaciones:", error);
    res.status(500).json({ 
      error: "Error al obtener postulaciones",
      mensaje: error.message 
    });
  }
};

/**
 * Obtener postulaciones por ID de publicación
 */
const getPostulationsByPublicationId = async (req, res) => {
  const { id_publicacion } = req.params;

  try {
    const postulations = await postulationQueries.findPostulationsByPublicationId(id_publicacion);
    
    const formattedPostulations = postulations.map(post => ({
      id_postulacion: post.id_postulacion,
      id_usuario: post.id_usuario,
      nombre: `${post.nombres || ''} ${post.apellidos || ''}`.trim() || 'Nombre no disponible',
      titulo_profesional: post.titulo_profesional || post.ultimo_cargo || 'Sin título especificado',
      biografia: post.ultima_empresa ? `Última experiencia en ${post.ultima_empresa}` : '',
      tarifa_hora: post.renta_esperada || 0,
      experiencia_anios: 0,
      correo: post.correo_contacto || '',
      telefono: post.telefono_contacto || '',
      fecha_postulacion: post.fecha_postulacion,
      estado_postulacion: post.estado_postulacion
    }));

    res.json(formattedPostulations);
  } catch (error) {
    console.error("Error al obtener postulaciones:", error);
    res.status(500).json({ 
      error: "Error al obtener postulaciones",
      mensaje: error.message 
    });
  }
};

/**
 * Verificar si un usuario ya postuló a una publicación
 */
const checkIfUserAppliedToPublication = async (req, res) => {
  const { id_publicacion } = req.params;
  const id_usuario = req.user?.id_usuario;

  if (!id_usuario) {
    return res.status(401).json({ 
      error: "Usuario no autenticado",
      hasApplied: false 
    });
  }

  try {
    const hasApplied = await postulationQueries.checkIfUserApplied(id_usuario, id_publicacion);
    res.json({ hasApplied });
  } catch (error) {
    console.error("Error al verificar postulación:", error);
    res.status(500).json({ 
      error: "Error al verificar postulación",
      mensaje: error.message,
      hasApplied: false
    });
  }
};

/**
 * Crear una nueva postulación
 */
const createPostulation = async (req, res) => {
  const { id_publicacion } = req.params;
  const id_usuario = req.user?.id_usuario;

  if (!id_usuario) {
    return res.status(401).json({ 
      error: "Usuario no autenticado" 
    });
  }

  try {
    // Verificar que el usuario sea freelancer
    if (req.user.tipo_usuario !== 'freelancer') {
      return res.status(403).json({ 
        error: "Solo los freelancers pueden postular a proyectos" 
      });
    }

    // Verificar que el perfil del freelancer esté completo
    const freelancerData = await profileQueries.buscarFreelancerByUserId(id_usuario);
    
    if (!freelancerData) {
      return res.status(400).json({ 
        error: "Debes completar tu perfil de freelancer para poder postular",
        errorType: "INCOMPLETE_PROFILE"
      });
    }

    // Verificar antecedentes personales (perfil completo)
    const { exists } = await profileQueries.checkFreelancerProfileExists(freelancerData.id_freelancer);
    
    if (!exists) {
      return res.status(400).json({ 
        error: "Debes completar tu perfil de freelancer para poder postular",
        errorType: "INCOMPLETE_PROFILE"
      });
    }

    // Crear la postulación
    const id_postulacion = await postulationQueries.createPostulation(id_usuario, id_publicacion);

    res.status(201).json({ 
      message: "Postulación creada exitosamente",
      id_postulacion,
      success: true
    });
  } catch (error) {
    console.error("Error al crear postulación:", error);
    
    // Manejar error de postulación duplicada
    if (error.message === 'Ya has postulado a este proyecto') {
      return res.status(409).json({ 
        error: error.message,
        errorType: "DUPLICATE_APPLICATION"
      });
    }

    res.status(500).json({ 
      error: "Error al crear postulación",
      mensaje: error.message 
    });
  }
};

module.exports = {
  getPostulationsByProjectId,
  getPostulationsByPublicationId,
  checkIfUserAppliedToPublication,
  createPostulation
};