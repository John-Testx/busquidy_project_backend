const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth');
const chatController = require('../controllers/chat/chatController');

// Proteger todas las rutas de chat
router.use(verifyToken);

// Rutas
router.get('/conversations', chatController.getConversations);
router.get('/messages/:conversationId', chatController.getMessages);
router.post('/conversations', chatController.createConversation);
router.get('/users', chatController.getUsersForChat);
router.get('/conversation/:conversationId', chatController.getConversationById);

module.exports = router;