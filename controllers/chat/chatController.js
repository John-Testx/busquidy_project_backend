const chatQueries = require('../../queries/chat/chatQueries');
const pool = require('../../db');
const { notificarNuevoMensaje } = require('../../services/notificationService');

const getConversations = async (req, res) => {
    try {
        const conversations = await chatQueries.getConversations(req.user.id_usuario);
        res.json(conversations);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener las conversaciones.' });
    }
};

const getMessages = async (req, res) => {
    try {
        const messages = await chatQueries.getMessages(req.params.conversationId);
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los mensajes.' });
    }
};

const createConversation = async (req, res) => {
    try {
        const { otherUserId } = req.body;
        const conversation = await chatQueries.startConversation(req.user.id_usuario, otherUserId);
        res.status(201).json(conversation);
    } catch (error) {
        res.status(500).json({ error: 'Error al iniciar la conversación.' });
    }
};

const getUsersForChat = async (req, res) => {
    try {
        const { id_usuario, tipo_usuario } = req.user;
        const users = await chatQueries.getUsersForChat(id_usuario, tipo_usuario);
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los usuarios para chatear.' });
    }
};

// ✅ NUEVA FUNCIÓN: Enviar mensaje (API REST - opcional)
const sendMessage = async (req, res) => {
    try {
        const { id_conversation, message_text } = req.body;
        const { id_usuario } = req.user;

        if (!message_text || message_text.trim() === '') {
            return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
        }

        // Guardar el mensaje en la BD
        const nuevoMensaje = await chatQueries.createMessage(
            id_conversation, 
            id_usuario, 
            message_text
        );

        // ✅ CREAR NOTIFICACIÓN
        // Obtener el otro usuario de la conversación
        const [conversacion] = await pool.query(
            "SELECT id_user_one, id_user_two FROM conversations WHERE id_conversation = ?",
            [id_conversation]
        );

        if (conversacion && conversacion.length > 0) {
            const id_receptor = conversacion[0].id_user_one === id_usuario 
                ? conversacion[0].id_user_two 
                : conversacion[0].id_user_one;

            // Obtener nombre del remitente
            const [remitente] = await pool.query(
                "SELECT correo FROM usuario WHERE id_usuario = ?",
                [id_usuario]
            );

            const nombreRemitente = remitente[0]?.correo || "Un usuario";

            // Crear la notificación
            await notificarNuevoMensaje(
                id_receptor,
                nombreRemitente,
                id_conversation
            );
        }

        res.status(201).json(nuevoMensaje);
    } catch (error) {
        console.error('Error al enviar mensaje:', error);
        res.status(500).json({ error: 'Error al enviar el mensaje.' });
    }
};

module.exports = {
    getConversations,
    getMessages,
    createConversation,
    getUsersForChat,
    sendMessage, // ✅ NUEVA
};