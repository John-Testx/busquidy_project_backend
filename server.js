require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const bodyParser = require("body-parser");
const routes = require("./routes");
const { createMessage } = require("./queries/chat/chatQueries"); 
const db = require('./db');
const { testDbConnection, ensureUploadDirectories } = require("./dbTest");

// ✅ IMPORTAR SERVICIO DE NOTIFICACIONES
const { notificarNuevoMensaje } = require("./services/notificationService");
const pool = require("./db");

const app = express();
const port = process.env.PORT || 3001;

// Carga tu configuración de Passport
const passport = require("passport");
require("./config/passport"); 

// ==================== CONFIGURACIÓN DE CORS ====================
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://localhost:3000",
      "http://localhost:3001",
      "https://localhost:3001",
      process.env.DB_TEST_HOST,
      process.env.FRONTEND_URL,
    ].filter(Boolean);

    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
  ],
  credentials: true,
  optionsSuccessStatus: 200,
};

// ==================== MIDDLEWARES ====================
app.use(cors(corsOptions));
app.use(passport.initialize());
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// ==================== RUTAS ====================
app.use("/api", routes);

// ==================== VERIFICACIONES INICIALES ====================
(async () => {
  await db.initialize();
  await testDbConnection();
  ensureUploadDirectories();
})();

// ==================== MANEJO DE ERRORES ====================
app.use((err, req, res, next) => {
  console.error("Error Stack:", err.stack);
  res.status(500).json({
    success: false,
    message: "Error interno del servidor",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// ==================== CONFIGURACIÓN DE SOCKET.IO ====================
const httpServer = http.createServer(app);

const io = new socketIo.Server(httpServer, {
  cors: corsOptions,
});

// ✅ HACER IO DISPONIBLE PARA LAS RUTAS
app.set('socketio', io);

let connectedUsers = 0;

// ✅ MAPA PARA TRACKEAR USUARIOS CONECTADOS (para notificaciones en tiempo real)
const userSocketMap = new Map(); // Map<userId, socketId>

// ✅ FUNCIÓN AUXILIAR PARA VERIFICAR PERMISOS DE CHAT
async function verificarPermisoChat(id_usuario_1, id_usuario_2) {
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
}

// ==================== SOCKET.IO CONNECTION ====================
io.on("connection", (socket) => {
  connectedUsers++;
  io.emit("usersCount", connectedUsers);
  console.log('🔌 Usuario conectado:', socket.id);

  // ✅ REGISTRAR USUARIO AL CONECTARSE
  socket.on('register_user', (userId) => {
    if (userId) {
      userSocketMap.set(userId, socket.id);
      socket.userId = userId;
      socket.join(`user_${userId}`); // Unir a sala personal para notificaciones
      console.log(`✅ Usuario ${userId} registrado con socket ${socket.id}`);
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

// ==================== INICIAR SERVIDOR ====================
httpServer.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Servidor Express y Socket.IO iniciado en el puerto ${port}`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || "development"}`);
});

module.exports = app;