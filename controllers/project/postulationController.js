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
      estado_postulacion: post.estado_postulacion,
      solicitud_pendiente: post.solicitud_pendiente // ✅ NUEVO CAMPO
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
      estado_postulacion: post.estado_postulacion,
      solicitud_pendiente: post.solicitud_pendiente // ✅ NUEVO CAMPO
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

/**
 * ✅ NUEVO: Contratar a un freelancer (aceptar postulación y habilitar chat)
 */
const hireFreelancer = async (req, res) => {
  const { id_postulacion } = req.params;
  const { id_usuario } = req.user; // Usuario empresa

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Obtener datos de la postulación
    const { getPostulacionData } = require('../../queries/notification/notificationHelperQueries');
    const postulacionData = await getPostulacionData(id_postulacion, connection);

    if (!postulacionData) {
      await connection.rollback();
      return res.status(404).json({ error: "Postulación no encontrada" });
    }

    // Verificar que el usuario sea el dueño del proyecto
    if (postulacionData.id_usuario_empresa !== id_usuario) {
      await connection.rollback();
      return res.status(403).json({ error: "No tienes permiso para contratar en este proyecto" });
    }

    // ✅ Actualizar estado de la postulación a 'aceptada' o 'en proceso'
    await connection.query(
      "UPDATE postulacion SET estado_postulacion = 'aceptada' WHERE id_postulacion = ?",
      [id_postulacion]
    );

    // ✅ Crear conversación automáticamente
    const [user1, user2] = [postulacionData.id_usuario_empresa, postulacionData.id_usuario_freelancer].sort((a, b) => a - b);
    
    const [existingConv] = await connection.query(
      "SELECT id_conversation FROM conversations WHERE id_user_one = ? AND id_user_two = ?",
      [user1, user2]
    );

    let id_conversation;
    if (existingConv.length > 0) {
      id_conversation = existingConv[0].id_conversation;
    } else {
      const [convResult] = await connection.query(
        "INSERT INTO conversations (id_user_one, id_user_two) VALUES (?, ?)",
        [user1, user2]
      );
      id_conversation = convResult.insertId;
    }

    // ✅ Enviar notificaciones a ambas partes
    const { notificarPostulacionAceptada } = require('../../services/notificationService');
    
    // Notificar al freelancer
    await notificarPostulacionAceptada(
      postulacionData.id_usuario_freelancer,
      postulacionData.nombre_proyecto,
      postulacionData.id_publicacion,
      connection
    );

    // Notificar a la empresa (opcional)
    await connection.query(
      `INSERT INTO notificaciones 
       (id_usuario_receptor, tipo_notificacion, mensaje, enlace) 
       VALUES (?, ?, ?, ?)`,
      [
        postulacionData.id_usuario_empresa,
        'freelancer_contratado',
        `Has contratado a '${postulacionData.nombre_freelancer}' para el proyecto '${postulacionData.nombre_proyecto}'.`,
        `/chat/${id_conversation}`
      ]
    );

    await connection.commit();

    // ✅ Emitir notificaciones en tiempo real
    try {
      const io = req.app.get('socketio');
      
      if (io) {
        // Notificar al freelancer
        io.to(`user_${postulacionData.id_usuario_freelancer}`).emit('new_notification', {
          tipo: 'postulacion_aceptada',
          mensaje: `¡Felicitaciones! Has sido contratado para el proyecto '${postulacionData.nombre_proyecto}'.`,
          enlace: `/chat/${id_conversation}`,
          fecha: new Date()
        });

        // Notificar a la empresa
        io.to(`user_${postulacionData.id_usuario_empresa}`).emit('new_notification', {
          tipo: 'freelancer_contratado',
          mensaje: `Has contratado a '${postulacionData.nombre_freelancer}'. Ya pueden chatear.`,
          enlace: `/chat/${id_conversation}`,
          fecha: new Date()
        });
      }
    } catch (socketError) {
      console.error("⚠️ Error al emitir notificación por socket:", socketError);
    }

    res.json({ 
      message: "Freelancer contratado exitosamente",
      id_conversation
    });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error al contratar freelancer:", error);
    res.status(500).json({ error: "Error al contratar al freelancer" });
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  getPostulationsByProjectId,
  getPostulationsByPublicationId,
  checkIfUserAppliedToPublication,
  createPostulation,
  hireFreelancer,
};