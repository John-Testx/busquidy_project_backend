const chatQueries = require('../../queries/chat/chatQueries');
const pool = require('../../db');
const { notificarNuevoMensaje } = require('../../services/notificationService');


/**
 * ✅ FUNCIÓN AUXILIAR: Verificar si el usuario tiene permiso para chatear
 */
const verificarPermisoChat = async (id_usuario_1, id_usuario_2) => {
  try {
    // Opción 1: Verificar si existe una solicitud de chat aceptada
    const [solicitudChat] = await pool.query(
      `SELECT id_solicitud 
       FROM solicitudes_contacto 
       WHERE tipo_solicitud = 'chat'
         AND estado_solicitud = 'aceptada'
         AND ((id_solicitante = ? AND id_receptor = ?) 
              OR (id_solicitante = ? AND id_receptor = ?))
       LIMIT 1`,
      [id_usuario_1, id_usuario_2, id_usuario_2, id_usuario_1]
    );

    if (solicitudChat.length > 0) {
      return true;
    }

    // Opción 2: Verificar si existe una postulación aceptada o en proceso
    const [postulacionAceptada] = await pool.query(
      `SELECT p.id_postulacion
       FROM postulacion p
       INNER JOIN freelancer f ON p.id_freelancer = f.id_freelancer
       INNER JOIN publicacion_proyecto pp ON p.id_publicacion = pp.id_publicacion
       INNER JOIN proyecto pr ON pp.id_proyecto = pr.id_proyecto
       INNER JOIN empresa e ON pr.id_empresa = e.id_empresa
       WHERE p.estado_postulacion IN ('aceptada', 'en proceso')
         AND ((f.id_usuario = ? AND e.id_usuario = ?) 
              OR (f.id_usuario = ? AND e.id_usuario = ?))
       LIMIT 1`,
      [id_usuario_1, id_usuario_2, id_usuario_2, id_usuario_1]
    );

    if (postulacionAceptada.length > 0) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error al verificar permiso de chat:', error);
    return false;
  }
};

const getConversations = async (req, res) => {
    try {
        const { id_usuario } = req.user;
        const allConversations = await chatQueries.getConversations(id_usuario);
        
        // ✅ FILTRAR CONVERSACIONES: Solo mostrar aquellas donde el usuario tiene permiso
        const conversationsWithPermission = [];
        
        for (const conv of allConversations) {
            const otherUserId = conv.user_one_id === id_usuario 
                ? conv.user_two_id 
                : conv.user_one_id;
            
            const hasPermission = await verificarPermisoChat(id_usuario, otherUserId);
            
            if (hasPermission) {
                conversationsWithPermission.push(conv);
            }
        }
        
        res.json(conversationsWithPermission);
    } catch (error) {
        console.error('Error al obtener las conversaciones:', error);
        res.status(500).json({ error: 'Error al obtener las conversaciones.' });
    }
};

const getMessages = async (req, res) => {
    try {
        const messages = await chatQueries.getMessages(req.params.conversationId);
        res.json(messages);
    } catch (error) {
        console.error('Error al obtener los mensajes:', error);
        res.status(500).json({ error: 'Error al obtener los mensajes.' });
    }
};

const createConversation = async (req, res) => {
    try {
        const { otherUserId } = req.body;
        const conversation = await chatQueries.startConversation(req.user.id_usuario, otherUserId);
        res.status(201).json(conversation);
    } catch (error) {
        console.error('Error al iniciar la conversación:', error);
        res.status(500).json({ error: 'Error al iniciar la conversación.' });
    }
};

const getUsersForChat = async (req, res) => {
    try {
        const { id_usuario, tipo_usuario } = req.user;
        const users = await chatQueries.getUsersForChat(id_usuario, tipo_usuario);
        res.json(users);
    } catch (error) {
        console.error('Error al obtener los usuarios para chatear:', error);
        res.status(500).json({ error: 'Error al obtener los usuarios para chatear.' });
    }
};

/**
 * ✅ MODIFICADO: Enviar mensaje con validación de seguridad
 */
const sendMessage = async (req, res) => {
    try {
        const { id_conversation, message_text } = req.body;
        const { id_usuario } = req.user;

        if (!message_text || message_text.trim() === '') {
            return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
        }

        // ✅ VERIFICAR QUE EL USUARIO SEA PARTE DE LA CONVERSACIÓN
        const [conversacion] = await pool.query(
            "SELECT id_user_one, id_user_two FROM conversations WHERE id_conversation = ?",
            [id_conversation]
        );

        if (!conversacion || conversacion.length === 0) {
            return res.status(404).json({ error: 'Conversación no encontrada' });
        }

        const { id_user_one, id_user_two } = conversacion[0];

        if (id_usuario !== id_user_one && id_usuario !== id_user_two) {
            return res.status(403).json({ error: 'No tienes permiso para enviar mensajes en esta conversación' });
        }

        const otherUserId = id_usuario === id_user_one ? id_user_two : id_user_one;

        // ✅ VERIFICAR PERMISO DE CHAT (solicitud aceptada o postulación aceptada)
        const hasPermission = await verificarPermisoChat(id_usuario, otherUserId);

        if (!hasPermission) {
            return res.status(403).json({ 
                error: 'No tienes permiso para chatear. Debe existir una solicitud de chat aceptada o una postulación aceptada/en proceso.' 
            });
        }

        // Guardar el mensaje en la BD
        const nuevoMensaje = await chatQueries.createMessage(
            id_conversation, 
            id_usuario, 
            message_text
        );

        // ✅ CREAR NOTIFICACIÓN
        const [remitente] = await pool.query(
            "SELECT correo FROM usuario WHERE id_usuario = ?",
            [id_usuario]
        );

        const nombreRemitente = remitente[0]?.correo || "Un usuario";

        await notificarNuevoMensaje(
            otherUserId,
            nombreRemitente,
            id_conversation
        );

        res.status(201).json(nuevoMensaje);
    } catch (error) {
        console.error('Error al enviar mensaje:', error);
        res.status(500).json({ error: 'Error al enviar el mensaje.' });
    }
};

// Obtener conversación por ID con estado de solicitud
const getConversationById = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { id_usuario } = req.user;

        // Obtener información de la conversación
        const [conversationInfo] = await pool.query(
            `SELECT 
                c.id_conversation,
                c.id_user_one,
                c.id_user_two,
                u1.correo AS user_one_email,
                u2.correo AS user_two_email
             FROM conversations c
             JOIN usuario u1 ON c.id_user_one = u1.id_usuario
             JOIN usuario u2 ON c.id_user_two = u2.id_usuario
             WHERE c.id_conversation = ?`,
            [conversationId]
        );

        if (conversationInfo.length === 0) {
            return res.status(404).json({ error: 'Conversación no encontrada' });
        }

        const conversation = conversationInfo[0];

        // Verificar que el usuario actual sea parte de la conversación
        if (conversation.id_user_one !== id_usuario && conversation.id_user_two !== id_usuario) {
            return res.status(403).json({ error: 'No tienes acceso a esta conversación' });
        }

        const otherUserId = conversation.id_user_one === id_usuario 
            ? conversation.id_user_two 
            : conversation.id_user_one;

        // ✅ VERIFICAR PERMISO DE CHAT
        const hasPermission = await verificarPermisoChat(id_usuario, otherUserId);

        if (!hasPermission) {
            return res.status(403).json({ 
                error: 'No tienes permiso para acceder a esta conversación' 
            });
        }

        // Obtener los mensajes
        const messages = await chatQueries.getMessages(conversationId);

        // Buscar si existe una solicitud de chat asociada
        const [solicitudInfo] = await pool.query(
            `SELECT sc.*, po.id_postulacion
             FROM solicitudes_contacto sc
             LEFT JOIN postulacion po ON sc.id_postulacion = po.id_postulacion
             WHERE sc.tipo_solicitud = 'chat'
               AND ((sc.id_solicitante = ? AND sc.id_receptor = ?) 
                    OR (sc.id_solicitante = ? AND sc.id_receptor = ?))
             ORDER BY sc.fecha_creacion DESC
             LIMIT 1`,
            [id_usuario, otherUserId, otherUserId, id_usuario]
        );

        const solicitudData = solicitudInfo.length > 0 ? solicitudInfo[0] : null;

        res.json({
            conversation,
            messages,
            solicitud: solicitudData,
            currentUserId: id_usuario
        });
    } catch (error) {
        console.error('Error al obtener conversación:', error);
        res.status(500).json({ error: 'Error al obtener la conversación.' });
    }
};


module.exports = {
    getConversations,
    getMessages,
    createConversation,
    getUsersForChat,
    sendMessage,
    getConversationById,
};