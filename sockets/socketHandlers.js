// backend/sockets/socketHandlers.js
const { createMessage, verificarPermisoChat } = require("../queries/chat/chatQueries");
const { notificarNuevoMensaje } = require("../services/notificationService");

const pool = require("../db");


let connectedUsers = 0;

// Mapa de usuarios conectados
const userSocketMap = new Map(); 

module.exports = (io) => {
  io.on("connection", (socket) => {
    
    connectedUsers++;
    io.emit("usersCount", connectedUsers);

    console.log('🔌 Usuario conectado:', socket.id);

    // --- GESTIÓN DE USUARIOS ---
    socket.on('register_user', (userId) => {
      if (userId) {
        userSocketMap.set(userId, socket.id);
        socket.userId = userId;
        socket.join(`user_${userId}`); // Sala personal crítica para notificaciones
        console.log(`✅ Usuario ${userId} registrado en sala 'user_${userId}'`);
      }
    });

    // ==================== LÓGICA DE WEBRTC ====================
    // Listener para unirse a la sala     
    socket.on('join-video-room', (roomId, userId) => {
        socket.join(roomId);
        socket.roomId = roomId;
        socket.userId = userId;

        socket.to(roomId).emit('user-connected', userId);
        console.log(`Usuario ${userId} se unió a la sala de video ${roomId}`);

        socket.on('offer', (payload) => {
        io.to(payload.target).emit('offer', { sdp: payload.sdp, source: userId });
        });

        socket.on('answer', (payload) => {
        io.to(payload.target).emit('answer', { sdp: payload.sdp, source: userId });
        });

        socket.on('ice-candidate', (payload) => {
        io.to(payload.target).emit('ice-candidate', { candidate: payload.candidate, source: userId });
        });
    });

    // Listener del CHAT de video (mantener como está)
    socket.on('send-chat-message', (message) => {
        if (socket.roomId) {
        io.to(socket.roomId).emit('receive-chat-message', {
            message: message,
            sender: socket.userId
        });
        }
    });
    // ==================== FIN LÓGICA DE WEBRTC ====================


    // ==================== LÓGICA DE CHAT INTEGRADO ====================
    
    // Usuario se une a una sala de chat
    socket.on('join_chat_room', (conversationId) => {
        socket.join(conversationId);
        console.log(`💬 Usuario ${socket.id} se unió a la sala de chat ${conversationId}`);
    });


    // ✅ MODIFICADO: Enviar mensaje con validación de seguridad
    socket.on('send_message', async (data) => {
        try {
        const { id_conversation, id_sender, message_text } = data;
        
        // Validación básica
        if (!message_text || message_text.trim() === '') {
            socket.emit('message_error', { error: 'El mensaje no puede estar vacío' });
            return;
        }

        // ✅ 1. VERIFICAR QUE LA CONVERSACIÓN EXISTA Y EL USUARIO SEA PARTE
        const [conversacion] = await pool.query(
            "SELECT id_user_one, id_user_two FROM conversations WHERE id_conversation = ?",
            [id_conversation]
        );

        if (!conversacion || conversacion.length === 0) {
            socket.emit('message_error', { error: 'Conversación no encontrada' });
            return;
        }

        const { id_user_one, id_user_two } = conversacion[0];

        // Verificar que el sender sea parte de la conversación
        if (id_sender !== id_user_one && id_sender !== id_user_two) {
            socket.emit('message_error', { error: 'No tienes permiso para enviar mensajes en esta conversación' });
            return;
        }

        const otherUserId = id_sender === id_user_one ? id_user_two : id_user_one;

        // ✅ 2. VERIFICAR PERMISO DE CHAT (solicitud aceptada o postulación aceptada/en proceso)
        const hasPermission = await verificarPermisoChat(id_sender, otherUserId);

        if (!hasPermission) {
            socket.emit('message_error', { 
            error: 'No tienes permiso para chatear. Debe existir una solicitud de chat aceptada o una postulación aceptada/en proceso.' 
            });
            return;
        }

        // ✅ 3. GUARDAR EL MENSAJE EN LA BASE DE DATOS
        const nuevoMensaje = await createMessage(id_conversation, id_sender, message_text);

        // ✅ 4. EMITIR EL MENSAJE A TODOS EN LA SALA (incluido el remitente)
        if (nuevoMensaje) {
            io.to(id_conversation).emit('receive_message', nuevoMensaje);
            console.log(`📨 Mensaje emitido a la sala ${id_conversation}`);

            // ✅ 5. CREAR NOTIFICACIÓN EN LA BD
            try {
            // Obtener nombre del remitente para la notificación
            const [remitente] = await pool.query(
                `SELECT u.correo, 
                        COALESCE(
                            CONCAT(ap.nombres, ' ', ap.apellidos),
                            emp.nombre_empresa,
                            u.correo
                        ) as nombre_display
                FROM usuario u
                LEFT JOIN freelancer f ON u.id_usuario = f.id_usuario
                LEFT JOIN antecedentes_personales ap ON f.id_freelancer = ap.id_freelancer
                LEFT JOIN empresa e ON u.id_usuario = e.id_usuario
                LEFT JOIN empresa emp ON e.id_empresa = emp.id_empresa
                WHERE u.id_usuario = ?`,
                [id_sender]
            );

            const nombreRemitente = remitente[0]?.nombre_display || "Un usuario";

            // Crear la notificación en la BD
            await notificarNuevoMensaje(
                otherUserId,
                nombreRemitente,
                id_conversation
            );

            // ✅ 6. EMITIR NOTIFICACIÓN EN TIEMPO REAL AL RECEPTOR
            io.to(`user_${otherUserId}`).emit('new_notification', {
                tipo: 'nuevo_mensaje',
                mensaje: `Tienes un nuevo mensaje de '${nombreRemitente}'.`,
                enlace: `/chat/${id_conversation}`,
                fecha: new Date()
            });

            console.log(`🔔 Notificación enviada al usuario ${otherUserId}`);
            } catch (notifError) {
            console.error("⚠️ Error al crear notificación:", notifError);
            // No fallar el envío del mensaje si la notificación falla
            }
        }
        } catch (error) {
        console.error("❌ Error al procesar el mensaje:", error);
        socket.emit('message_error', { error: 'Error al enviar el mensaje' });
        }
    });


    // ✅ OPCIONAL: Marcar conversación como vista
    socket.on('mark_conversation_as_seen', async (data) => {
        try {
        const { id_conversation, id_usuario } = data;
        console.log(`Usuario ${id_usuario} vio la conversación ${id_conversation}`);
        // Aquí podrías actualizar la BD para marcar mensajes como leídos
        } catch (error) {
        console.error("Error al marcar como visto:", error);
        }
    });
  
  // ==================== FIN LÓGICA DE CHAT INTEGRADO ====================


    // ==================== DISCONNECT ====================
    socket.on("disconnect", () => {
        connectedUsers--;
        io.emit("usersCount", connectedUsers);

        // ✅ ELIMINAR USUARIO DEL MAPA
        if (socket.userId) {
            userSocketMap.delete(socket.userId);
            console.log(`❌ Usuario ${socket.userId} desconectado`);
        }

        if (socket.roomId) {
            socket.to(socket.roomId).emit('user-disconnected', socket.id);
            console.log(`Usuario ${socket.id} se desconectó de la sala de video ${socket.roomId}`);
        }
    });
  });
};