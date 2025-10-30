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
          enlace: `/solicitudes/${id_solicitud}`,
          fecha: new Date()
        };

        io.to(`user_${id_usuario_receptor}`).emit('new_notification', notificacionRealTime);
        console.log(`🔔 Notificación de solicitud ${tipo_solicitud} enviada al usuario ${id_usuario_receptor}`);
      }
    } catch (socketError) {
      // No fallar la operación si el socket falla
      console.error("⚠️ Error al emitir notificación por socket:", socketError);
    }

    res.status(201).json({ 
      message: "Solicitud creada exitosamente",
      id_solicitud 
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
 * Responder a una solicitud (aceptar/rechazar/reprogramar)
 */
const responderSolicitud = async (req, res) => {
  const { id_solicitud } = req.params;
  const { respuesta, nueva_fecha } = req.body; // respuesta: 'aceptada', 'rechazada', 'reprogramar'

  if (!['aceptada', 'rechazada', 'reprogramar'].includes(respuesta)) {
    return res.status(400).json({ error: "Respuesta inválida" });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Actualizar estado
    await connection.query(
      "UPDATE solicitudes_contacto SET estado_solicitud = ?, fecha_entrevista_sugerida = ? WHERE id_solicitud = ?",
      [respuesta, nueva_fecha || null, id_solicitud]
    );

    // ✅ OBTENER DATOS PARA NOTIFICACIÓN
    const solicitudData = await getSolicitudContactoData(id_solicitud);

    if (solicitudData) {
      const nombreFreelancer = solicitudData.nombre_freelancer;
      const idUsuarioEmpresa = solicitudData.id_solicitante;

      // Notificar a la empresa según el tipo de respuesta
      if (solicitudData.tipo_solicitud === 'chat') {
        if (respuesta === 'aceptada') {
          await notificarSolicitudChatAceptada(
            idUsuarioEmpresa,
            nombreFreelancer,
            null, // id_conversacion si ya existe
            connection
          );
        } else if (respuesta === 'rechazada') {
          await notificarSolicitudChatRechazada(
            idUsuarioEmpresa,
            nombreFreelancer,
            connection
          );
        }
      } else if (solicitudData.tipo_solicitud === 'entrevista') {
        if (respuesta === 'aceptada') {
          await notificarSolicitudEntrevistaAceptada(
            idUsuarioEmpresa,
            nombreFreelancer,
            null, // id_entrevista
            connection
          );
        } else if (respuesta === 'rechazada') {
          await notificarSolicitudEntrevistaRechazada(
            idUsuarioEmpresa,
            nombreFreelancer,
            connection
          );
        } else if (respuesta === 'reprogramar') {
          await notificarSolicitudEntrevistaReprogramar(
            idUsuarioEmpresa,
            nombreFreelancer,
            nueva_fecha,
            id_solicitud,
            connection
          );
        }
      }
    }

    // ✅ COMMIT ANTES DE EMITIR SOCKET
    await connection.commit();

    // ✅ EMITIR NOTIFICACIÓN EN TIEMPO REAL VIA SOCKET.IO
    if (solicitudData) {
      try {
        const io = req.app.get('socketio');
        
        if (io) {
          let tipoNotificacion = '';
          let mensajeNotificacion = '';
          let enlaceNotificacion = null;

          if (solicitudData.tipo_solicitud === 'chat') {
            if (respuesta === 'aceptada') {
              tipoNotificacion = 'solicitud_chat_aceptada';
              mensajeNotificacion = `'${solicitudData.nombre_freelancer}' aceptó tu solicitud de chat. Ya pueden conversar.`;
              enlaceNotificacion = `/chat/${null}`; // Actualizar cuando se cree la conversación
            } else if (respuesta === 'rechazada') {
              tipoNotificacion = 'solicitud_chat_rechazada';
              mensajeNotificacion = `'${solicitudData.nombre_freelancer}' rechazó tu solicitud de chat.`;
            }
          } else if (solicitudData.tipo_solicitud === 'entrevista') {
            if (respuesta === 'aceptada') {
              tipoNotificacion = 'solicitud_entrevista_aceptada';
              mensajeNotificacion = `'${solicitudData.nombre_freelancer}' aceptó tu invitación a la entrevista.`;
              enlaceNotificacion = `/entrevistas/${null}`; // Actualizar cuando se cree la entrevista
            } else if (respuesta === 'rechazada') {
              tipoNotificacion = 'solicitud_entrevista_rechazada';
              mensajeNotificacion = `'${solicitudData.nombre_freelancer}' rechazó tu invitación a la entrevista.`;
            } else if (respuesta === 'reprogramar') {
              tipoNotificacion = 'solicitud_entrevista_reprogramar';
              mensajeNotificacion = `'${solicitudData.nombre_freelancer}' ha sugerido una nueva fecha para la entrevista.`;
              enlaceNotificacion = `/solicitudes/${id_solicitud}`;
            }
          }

          if (tipoNotificacion) {
            const notificacionRealTime = {
              tipo: tipoNotificacion,
              mensaje: mensajeNotificacion,
              enlace: enlaceNotificacion,
              fecha: new Date()
            };

            io.to(`user_${solicitudData.id_solicitante}`).emit('new_notification', notificacionRealTime);
            console.log(`🔔 Notificación de respuesta de solicitud enviada al usuario ${solicitudData.id_solicitante}`);
          }
        }
      } catch (socketError) {
        console.error("⚠️ Error al emitir notificación por socket:", socketError);
      }
    }

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

module.exports = {
  crearSolicitud,
  responderSolicitud,
  obtenerSolicitudes
};