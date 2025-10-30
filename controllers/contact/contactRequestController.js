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
const { getSolicitudContactoData } = require("../../queries/notification/notificationHelperQueries");

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
    const [postulacion] = await connection.query(
      `SELECT po.id_freelancer, f.id_usuario as id_usuario_freelancer,
              CONCAT(ap.nombres, ' ', ap.apellidos) as nombre_freelancer,
              p.nombre_proyecto, emp.nombre_empresa
       FROM postulacion po
       INNER JOIN freelancer f ON po.id_freelancer = f.id_freelancer
       INNER JOIN antecedentes_personales ap ON f.id_freelancer = ap.id_freelancer
       INNER JOIN publicacion_proyecto pp ON po.id_publicacion = pp.id_publicacion
       INNER JOIN proyecto p ON pp.id_proyecto = p.id_proyecto
       INNER JOIN empresa e ON p.id_empresa = e.id_empresa
       INNER JOIN empresa emp ON e.id_empresa = emp.id_empresa
       WHERE po.id_postulacion = ?`,
      [id_postulacion]
    );

    if (!postulacion || postulacion.length === 0) {
      return res.status(404).json({ error: "Postulación no encontrada" });
    }

    const id_receptor = postulacion[0].id_usuario_freelancer;
    const nombreEmpresa = postulacion[0].nombre_empresa;
    const nombreProyecto = postulacion[0].nombre_proyecto;

    // Insertar solicitud
    const [result] = await connection.query(
      `INSERT INTO solicitudes_contacto 
       (id_postulacion, id_solicitante, id_receptor, tipo_solicitud, estado_solicitud, 
        fecha_entrevista_sugerida, mensaje_solicitud)
       VALUES (?, ?, ?, ?, 'pendiente', ?, ?)`,
      [id_postulacion, id_usuario, id_receptor, tipo_solicitud, 
       fecha_entrevista_sugerida || null, mensaje_solicitud || null]
    );

    const id_solicitud = result.insertId;

    // ✅ NOTIFICAR AL FREELANCER
    if (tipo_solicitud === 'chat') {
      await notificarSolicitudChatRecibida(
        id_receptor,
        nombreEmpresa,
        id_solicitud,
        connection
      );
    } else if (tipo_solicitud === 'entrevista') {
      await notificarSolicitudEntrevistaRecibida(
        id_receptor,
        nombreEmpresa,
        nombreProyecto,
        fecha_entrevista_sugerida,
        id_solicitud,
        connection
      );
    }

    await connection.commit();
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
          // Aquí podrías crear la conversación automáticamente
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
              p.nombre_proyecto
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