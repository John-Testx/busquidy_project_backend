const postulationQueries = require("../../queries/project/postulationQueries");

/**
 * Controlador de postulaciones
 */

// Obtener postulaciones por ID de proyecto
const getPostulationsByProjectId = async (req, res) => {
  const { id_proyecto } = req.params;

  try {
    const postulations = await postulationQueries.findPostulationsByProjectId(id_proyecto);
    
    // Formatear respuesta para el frontend
    const formattedPostulations = postulations.map(post => ({
      id_postulacion: post.id_postulacion,
      id_usuario: post.id_usuario,
      nombre: `${post.nombres || ''} ${post.apellidos || ''}`.trim() || 'Nombre no disponible',
      titulo_profesional: post.titulo_profesional || post.ultimo_cargo || 'Sin título especificado',
      biografia: post.ultima_empresa ? `Última experiencia en ${post.ultima_empresa}` : '',
      tarifa_hora: post.renta_esperada || 0,
      experiencia_anios: 0, // No disponible en las tablas actuales
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

// Obtener postulaciones por ID de publicación
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

module.exports = {
  getPostulationsByProjectId,
  getPostulationsByPublicationId
};