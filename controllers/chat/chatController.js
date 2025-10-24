const chatQueries = require('../../queries/chat/chatQueries');

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

module.exports = {
    getConversations,
    getMessages,
    createConversation,
    getUsersForChat,
};