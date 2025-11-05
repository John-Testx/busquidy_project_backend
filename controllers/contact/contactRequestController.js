const pool = require("../../db");
const {
  notificarSolicitudChatRecibida,
  notificarSolicitudEntrevistaRecibida,
  notificarSolicitudChatAceptada,
  notificarSolicitudChatRechazada,
  notificarSolicitudEntrevistaAceptada,
  notificarSolicitudEntrevistaRechazada,
  notificarSolicitudEntrevistaReprogramar
} = require("../../services/notificationService");
const { 
  getSolicitudContactoData,
  getReceptorDataForContactRequest // ✅ AÑADIDO
} = require("../../queries/notification/notificationHelperQueries");

/**
 * Controlador de solicitudes de contacto (chat/entrevista)
 */

/**
 * Crear una solicitud de contacto (chat o entrevista)
 */
const crearSolicitud = async (req, res) => {
  const { 
    id_postulacion, 
    tipo_solicitud, 
    fecha_entrevista_sugerida, 
    mensaje_solicitud 
  } = req.body;
  const { id_usuario } = req.user; // Usuario empresa que crea la solicitud

  if (!['chat', 'entrevista'].includes(tipo_solicitud)) {
    return res.status(400).json({ error: "Tipo de solicitud inválido" });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Obtener datos de la postulación
    const receptorData = await getReceptorDataForContactRequest(id_postulacion, connection);

    if (!receptorData) {
      await connection.rollback();
      return res.status(404).json({ error: "Postulación no encontrada" });
    }

    const { 
      id_usuario_receptor, 
      nombre_empresa, 
      nombre_proyecto 
    } = receptorData;

    // ✅ VERIFICAR QUE NO HAYA SOLICITUD PENDIENTE
    const [existingSolicitud] = await connection.query(
      `SELECT id_solicitud FROM solicitudes_contacto 
       WHERE id_postulacion = ? AND estado_solicitud = 'pendiente'`,
      [id_postulacion]
    );

    if (existingSolicitud.length > 0) {
      await connection.rollback();
      return res.status(409).json({ error: "Ya existe una solicitud pendiente para esta postulación" });
    }

    // Insertar solicitud
    const [result] = await connection.query(
      `INSERT INTO solicitudes_contacto 
       (id_postulacion, id_solicitante, id_receptor, tipo_solicitud, estado_solicitud, 
        fecha_entrevista_sugerida, mensaje_solicitud)
       VALUES (?, ?, ?, ?, 'pendiente', ?, ?)`,
      [id_postulacion, id_usuario, id_usuario_receptor, tipo_solicitud, 
       fecha_entrevista_sugerida || null, mensaje_solicitud || null]
    );

    const id_solicitud = result.insertId;

    // ✅ SI ES CHAT, CREAR CONVERSACIÓN INMEDIATAMENTE
    let id_conversation = null;
    if (tipo_solicitud === 'chat') {
      const [user1, user2] = [id_usuario, id_usuario_receptor].sort((a, b) => a - b);
      
      // Verificar si ya existe una conversación
      const [existingConv] = await connection.query(
        "SELECT id_conversation FROM conversations WHERE id_user_one = ? AND id_user_two = ?",
        [user1, user2]
      );

      if (existingConv.length > 0) {
        id_conversation = existingConv[0].id_conversation;
      } else {
        const [convResult] = await connection.query(
          "INSERT INTO conversations (id_user_one, id_user_two) VALUES (?, ?)",
          [user1, user2]
        );
        id_conversation = convResult.insertId;
      }
    }

    // ✅ CREAR NOTIFICACIÓN EN BASE DE DATOS
    if (tipo_solicitud === 'chat') {
      await notificarSolicitudChatRecibida(
        id_usuario_receptor,
        nombre_empresa,
        id_solicitud,
        connection
      );
    } else if (tipo_solicitud === 'entrevista') {
      await notificarSolicitudEntrevistaRecibida(
        id_usuario_receptor,
        nombre_empresa,
        nombre_proyecto,
        fecha_entrevista_sugerida,
        id_solicitud,
        connection
      );
    }

    // ✅ COMMIT ANTES DE EMITIR SOCKET
    await connection.commit();

    // ✅ EMITIR NOTIFICACIÓN EN TIEMPO REAL VIA SOCKET.IO
    try {
      const io = req.app.get('socketio');
      
      if (io) {
        const notificacionRealTime = {
          tipo: tipo_solicitud === 'chat' ? 'solicitud_chat_recibida' : 'solicitud_entrevista_recibida',
          mensaje: tipo_solicitud === 'chat' 
            ? `La Empresa '${nombre_empresa}' quiere chatear contigo sobre tu postulación.`
            : `'${nombre_empresa}' te ha invitado a una entrevista para el proyecto '${nombre_proyecto}'.`,
          enlace: tipo_solicitud === 'chat' 
            ? `/chat/${id_conversation}` 
            : `/interview/request/${id_solicitud}`,
          fecha: new Date()
        };

        io.to(`user_${id_usuario_receptor}`).emit('new_notification', notificacionRealTime);
        console.log(`🔔 Notificación de solicitud ${tipo_solicitud} enviada al usuario ${id_usuario_receptor}`);
      }
    } catch (socketError) {
      console.error("⚠️ Error al emitir notificación por socket:", socketError);
    }

    res.status(201).json({ 
      message: "Solicitud creada exitosamente",
      id_solicitud,
      id_conversation: tipo_solicitud === 'chat' ? id_conversation : null
    });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error al crear solicitud:", error);
    res.status(500).json({ error: "Error al crear la solicitud" });
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Responder a una solicitud (aceptar/rechazar/reprogramar) - MODIFICADO
 */
const responderSolicitud = async (req, res) => {
  const { id_solicitud } = req.params;
  const { respuesta, nueva_fecha } = req.body;

  if (!['aceptada', 'rechazada', 'reprogramar'].includes(respuesta)) {
    return res.status(400).json({ error: "Respuesta inválida" });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Obtener datos de la solicitud
    const solicitudData = await getSolicitudContactoData(id_solicitud);

    if (!solicitudData) {
      await connection.rollback();
      return res.status(404).json({ error: "Solicitud no encontrada" });
    }

    // Actualizar estado
    await connection.query(
      "UPDATE solicitudes_contacto SET estado_solicitud = ?, fecha_entrevista_sugerida = ? WHERE id_solicitud = ?",
      [respuesta, nueva_fecha || solicitudData.fecha_entrevista_sugerida, id_solicitud]
    );

    const nombreFreelancer = solicitudData.nombre_freelancer;
    const idUsuarioEmpresa = solicitudData.id_solicitante;

    // ✅ LÓGICA SEGÚN TIPO DE SOLICITUD Y RESPUESTA
    if (solicitudData.tipo_solicitud === 'chat') {
      if (respuesta === 'aceptada') {
        // ✅ CREAR CONVERSACIÓN EN LA TABLA conversations
        const [user1, user2] = [solicitudData.id_solicitante, solicitudData.id_usuario_freelancer].sort((a, b) => a - b);
        
        // Verificar si ya existe una conversación
        const [existingConv] = await connection.query(
          "SELECT id_conversation FROM conversations WHERE id_user_one = ? AND id_user_two = ?",
          [user1, user2]
        );

        let id_conversation;
        if (existingConv.length > 0) {
          id_conversation = existingConv[0].id_conversation;
        } else {
          const [result] = await connection.query(
            "INSERT INTO conversations (id_user_one, id_user_two) VALUES (?, ?)",
            [user1, user2]
          );
          id_conversation = result.insertId;
        }

        await notificarSolicitudChatAceptada(
          idUsuarioEmpresa,
          nombreFreelancer,
          id_conversation,
          connection
        );

        // Emitir notificación en tiempo real
        try {
          const io = req.app.get('socketio');
          if (io) {
            io.to(`user_${idUsuarioEmpresa}`).emit('new_notification', {
              tipo: 'solicitud_chat_aceptada',
              mensaje: `'${nombreFreelancer}' aceptó tu solicitud de chat. Ya pueden conversar.`,
              enlace: `/chat/${id_conversation}`,
              fecha: new Date()
            });
          }
        } catch (socketError) {
          console.error("⚠️ Error al emitir notificación por socket:", socketError);
        }

      } else if (respuesta === 'rechazada') {
        await notificarSolicitudChatRechazada(
          idUsuarioEmpresa,
          nombreFreelancer,
          connection
        );

        try {
          const io = req.app.get('socketio');
          if (io) {
            io.to(`user_${idUsuarioEmpresa}`).emit('new_notification', {
              tipo: 'solicitud_chat_rechazada',
              mensaje: `'${nombreFreelancer}' rechazó tu solicitud de chat.`,
              enlace: null,
              fecha: new Date()
            });
          }
        } catch (socketError) {
          console.error("⚠️ Error al emitir notificación por socket:", socketError);
        }
      }

    } else if (solicitudData.tipo_solicitud === 'entrevista') {
      if (respuesta === 'aceptada') {
        await notificarSolicitudEntrevistaAceptada(
          idUsuarioEmpresa,
          nombreFreelancer,
          null,
          connection
        );

        try {
          const io = req.app.get('socketio');
          if (io) {
            io.to(`user_${idUsuarioEmpresa}`).emit('new_notification', {
              tipo: 'solicitud_entrevista_aceptada',
              mensaje: `'${nombreFreelancer}' aceptó tu invitación a la entrevista.`,
              enlace: `/solicitudes/${id_solicitud}`,
              fecha: new Date()
            });
          }
        } catch (socketError) {
          console.error("⚠️ Error al emitir notificación por socket:", socketError);
        }

      } else if (respuesta === 'rechazada') {
        await notificarSolicitudEntrevistaRechazada(
          idUsuarioEmpresa,
          nombreFreelancer,
          connection
        );

        try {
          const io = req.app.get('socketio');
          if (io) {
            io.to(`user_${idUsuarioEmpresa}`).emit('new_notification', {
              tipo: 'solicitud_entrevista_rechazada',
              mensaje: `'${nombreFreelancer}' rechazó tu invitación a la entrevista.`,
              enlace: null,
              fecha: new Date()
            });
          }
        } catch (socketError) {
          console.error("⚠️ Error al emitir notificación por socket:", socketError);
        }

      } else if (respuesta === 'reprogramar') {
        await notificarSolicitudEntrevistaReprogramar(
          idUsuarioEmpresa,
          nombreFreelancer,
          nueva_fecha,
          id_solicitud,
          connection
        );

        try {
          const io = req.app.get('socketio');
          if (io) {
            io.to(`user_${idUsuarioEmpresa}`).emit('new_notification', {
              tipo: 'solicitud_entrevista_reprogramar',
              mensaje: `'${nombreFreelancer}' ha sugerido una nueva fecha para la entrevista.`,
              enlace: `/solicitudes/${id_solicitud}`,
              fecha: new Date()
            });
          }
        } catch (socketError) {
          console.error("⚠️ Error al emitir notificación por socket:", socketError);
        }
      }
    }

    await connection.commit();
    res.json({ message: "Respuesta registrada exitosamente" });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error al responder solicitud:", error);
    res.status(500).json({ error: "Error al responder la solicitud" });
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Obtener solicitudes de un usuario
 */
const obtenerSolicitudes = async (req, res) => {
  try {
    const { id_usuario } = req.user;

    const [solicitudes] = await pool.query(
      `SELECT sc.*, 
              CONCAT(ap.nombres, ' ', ap.apellidos) as nombre_freelancer,
              emp.nombre_empresa,
              p.titulo as nombre_proyecto
       FROM solicitudes_contacto sc
       INNER JOIN postulacion po ON sc.id_postulacion = po.id_postulacion
       INNER JOIN freelancer f ON po.id_freelancer = f.id_freelancer
       INNER JOIN antecedentes_personales ap ON f.id_freelancer = ap.id_freelancer
       INNER JOIN publicacion_proyecto pp ON po.id_publicacion = pp.id_publicacion
       INNER JOIN proyecto p ON pp.id_proyecto = p.id_proyecto
       INNER JOIN empresa e ON p.id_empresa = e.id_empresa
       INNER JOIN empresa emp ON e.id_empresa = emp.id_empresa
       WHERE sc.id_receptor = ? OR sc.id_solicitante = ?
       ORDER BY sc.fecha_creacion DESC`,
      [id_usuario, id_usuario]
    );

    res.json(solicitudes);
  } catch (error) {
    console.error("Error al obtener solicitudes:", error);
    res.status(500).json({ error: "Error al obtener las solicitudes" });
  }
};

/**
 * Obtener detalles de una solicitud específica
 */
const obtenerSolicitudPorId = async (req, res) => {
  const { id_solicitud } = req.params;

  try {
    const [solicitudes] = await pool.query(
      `SELECT sc.*, 
              CONCAT(ap.nombres, ' ', ap.apellidos) as nombre_freelancer,
              emp.nombre_empresa,
              p.titulo as nombre_proyecto,
              po.id_postulacion,
              f.id_usuario as id_usuario_freelancer,
              e.id_usuario as id_usuario_empresa
       FROM solicitudes_contacto sc
       INNER JOIN postulacion po ON sc.id_postulacion = po.id_postulacion
       INNER JOIN freelancer f ON po.id_freelancer = f.id_freelancer
       INNER JOIN antecedentes_personales ap ON f.id_freelancer = ap.id_freelancer
       INNER JOIN publicacion_proyecto pp ON po.id_publicacion = pp.id_publicacion
       INNER JOIN proyecto p ON pp.id_proyecto = p.id_proyecto
       INNER JOIN empresa e ON p.id_empresa = e.id_empresa
       INNER JOIN empresa emp ON e.id_empresa = emp.id_empresa
       WHERE sc.id_solicitud = ?`,
      [id_solicitud]
    );

    if (solicitudes.length === 0) {
      return res.status(404).json({ error: "Solicitud no encontrada" });
    }

    res.json(solicitudes[0]);
  } catch (error) {
    console.error("Error al obtener solicitud:", error);
    res.status(500).json({ error: "Error al obtener la solicitud" });
  }
};

module.exports = {
  crearSolicitud,
  responderSolicitud,
  obtenerSolicitudes,
  obtenerSolicitudPorId,
};