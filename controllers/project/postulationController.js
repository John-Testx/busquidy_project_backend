const postulationQueries = require("../../queries/project/postulationQueries");
const profileQueries = require("../../queries/freelancer/profileQueries");
const db = require("../../db");

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
      solicitud_pendiente: post.solicitud_pendiente
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
  const { id_usuario } = req.user; // Usuario empresa logueado

  let connection;
  try {
    // ✅ 2. USAR LA INSTANCIA 'db' IMPORTADA
    connection = await db.getConnection(); 
    await connection.beginTransaction();

    // 1. Consulta optimizada
    const [postulacionData] = await connection.query(
      `SELECT 
        po.id_postulacion,
        po.id_freelancer,
        po.estado_postulacion,
        f.id_usuario AS id_usuario_freelancer,
        u_free.correo AS correo_freelancer,
        pr.id_proyecto,
        pr.titulo AS titulo_proyecto,
        pr.id_empresa,
        e.id_usuario AS id_usuario_empresa,
        e.nombre_empresa,
        CONCAT(ap.nombres, ' ', ap.apellidos) as nombre_freelancer
       FROM postulacion po
       JOIN freelancer f ON po.id_freelancer = f.id_freelancer
       JOIN usuario u_free ON f.id_usuario = u_free.id_usuario
       JOIN publicacion_proyecto pp ON po.id_publicacion = pp.id_publicacion
       JOIN proyecto pr ON pp.id_proyecto = pr.id_proyecto
       JOIN empresa e ON pr.id_empresa = e.id_empresa
       LEFT JOIN antecedentes_personales ap ON f.id_freelancer = ap.id_freelancer
       WHERE po.id_postulacion = ?`,
      [id_postulacion]
    );

    if (!postulacionData || postulacionData.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Postulación no encontrada" });
    }

    const postulacion = postulacionData[0];

    // ✅ 3. Verificar que la postulación no esté ya aceptada
    if (postulacion.estado_postulacion === 'aceptada' || postulacion.estado_postulacion === 'en proceso') {
      await connection.rollback();
      return res.status(400).json({ error: "Este freelancer ya fue contratado" });
    }

    // ✅ 4. Actualizar estado de la postulación a 'aceptada'
    await connection.query(
      "UPDATE postulacion SET estado_postulacion = 'aceptada' WHERE id_postulacion = ?",
      [id_postulacion]
    );

    // ✅ 5. Crear o encontrar conversación automáticamente
    const [user1, user2] = [postulacion.id_usuario_empresa, postulacion.id_usuario_freelancer].sort((a, b) => a - b);
    
    const [existingConv] = await connection.query(
      "SELECT id_conversation FROM conversations WHERE id_user_one = ? AND id_user_two = ?",
      [user1, user2]
    );

    let id_conversation;
    if (existingConv.length > 0) {
      id_conversation = existingConv[0].id_conversation;
    } else {
      const [convResult] = await connection.query(
        "INSERT INTO conversations (id_user_one, id_user_two, created_at) VALUES (?, ?, NOW())",
        [user1, user2]
      );
      id_conversation = convResult.insertId;
    }

    // ✅ 6. Crear solicitud de chat automática (aceptada)
    const [existingSolicitud] = await connection.query(
      `SELECT id_solicitud FROM solicitudes_contacto 
       WHERE id_postulacion = ? AND tipo_solicitud = 'chat'`,
      [id_postulacion]
    );

    if (existingSolicitud.length === 0) {
      await connection.query(
        `INSERT INTO solicitudes_contacto 
         (id_postulacion, id_solicitante, id_receptor, tipo_solicitud, estado_solicitud, fecha_creacion)
         VALUES (?, ?, ?, 'chat', 'aceptada', NOW())`,
        [id_postulacion, postulacion.id_usuario_empresa, postulacion.id_usuario_freelancer]
      );
    } else {
      // Actualizar a aceptada si existe pero está pendiente
      await connection.query(
        `UPDATE solicitudes_contacto 
         SET estado_solicitud = 'aceptada' 
         WHERE id_solicitud = ?`,
        [existingSolicitud[0].id_solicitud]
      );
    }

    // ✅ 7. Enviar notificación al freelancer
    await connection.query(
      `INSERT INTO notificaciones 
       (id_usuario_receptor, tipo_notificacion, mensaje, enlace, fecha_creacion) 
       VALUES (?, ?, ?, ?, NOW())`,
      [
        postulacion.id_usuario_freelancer,
        'postulacion_aceptada',
        `¡Felicitaciones! Has sido contratado para el proyecto '${postulacion.titulo_proyecto}'. Ya puedes chatear con la empresa.`,
        `/chat/${id_conversation}`
      ]
    );

    // ✅ 8. Enviar notificación a la empresa
    await connection.query(
      `INSERT INTO notificaciones 
       (id_usuario_receptor, tipo_notificacion, mensaje, enlace, fecha_creacion) 
       VALUES (?, ?, ?, ?, NOW())`,
      [
        postulacion.id_usuario_empresa,
        'freelancer_contratado',
        `Has contratado a '${postulacion.nombre_freelancer || 'Freelancer'}' para el proyecto '${postulacion.titulo_proyecto}'.`,
        `/chat/${id_conversation}`
      ]
    );

    await connection.commit();

    // ✅ 9. Emitir notificaciones en tiempo real (Socket.io)
    try {
      const io = req.app.get('socketio');
      
      if (io) {
        // Notificar al freelancer
        io.to(`user_${postulacion.id_usuario_freelancer}`).emit('new_notification', {
          tipo: 'postulacion_aceptada',
          mensaje: `¡Felicitaciones! Has sido contratado para el proyecto '${postulacion.titulo_proyecto}'.`,
          enlace: `/chat/${id_conversation}`,
          fecha: new Date()
        });

        // Notificar a la empresa
        io.to(`user_${postulacion.id_usuario_empresa}`).emit('new_notification', {
          tipo: 'freelancer_contratado',
          mensaje: `Has contratado a '${postulacion.nombre_freelancer || 'Freelancer'}'. Ya pueden chatear.`,
          enlace: `/chat/${id_conversation}`,
          fecha: new Date()
        });
      }
    } catch (socketError) {
      console.error("⚠️ Error al emitir notificación por socket:", socketError);
    }

    res.json({ 
        message: "Contratación exitosa. Chat habilitado.", 
        id_conversation: id_conversation
    });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error al contratar:", error);
    res.status(500).json({ error: "Error interno al procesar la contratación" });
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