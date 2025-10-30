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



const app = express();

const port = process.env.PORT || 3001;



// ==================== CONFIGURACIÓN DE CORS ====================

const corsOptions = {

  origin: function (origin, callback) {

    const allowedOrigins = [

      "http://localhost:5173",

      "http://localhost:3000",

      "https://localhost:3000",

      process.env.DB_TEST_HOST,

      process.env.FRONTEND_URL,

      // Añade tu IP local aquí para asegurar la conexión

      "http://localhost:5173",

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



// =====> LÍNEAS AÑADIDAS AQUÍ <=====

const io = new socketIo.Server(httpServer, {

  cors: corsOptions,

});

let connectedUsers = 0;

// ==================================



io.on("connection", (socket) => {

  // console.log("✅ Nuevo cliente conectado:", socket.id);

  connectedUsers++;

  io.emit("usersCount", connectedUsers);



  // ==================== LÓGICA DE WEBRTC ====================

 

  // Listener para unirse a la sala

  socket.on('join-video-room', (roomId, userId) => {

    socket.join(roomId);

    socket.roomId = roomId; // Guardamos la sala para usarla en otros eventos

    socket.userId = userId; // Guardamos el ID de usuario



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



  // =====> Listener del CHAT (MOVIDO AFUERA) <=====

  socket.on('send-chat-message', (message) => {

    // Usamos la sala y el usuario que guardamos en el socket

    if (socket.roomId) {

      io.to(socket.roomId).emit('receive-chat-message', {

          message: message,

          sender: socket.userId

      });

    }

  });

  // ==================== LÓGICA DE CHAT INTEGRADO ====================

// Escuchar por nuevos mensajes
  socket.on('join_chat_room', (conversationId) => {
    socket.join(conversationId);
    console.log(`Usuario ${socket.id} se unió a la sala de chat ${conversationId}`);
  });

  socket.on('send_message', async (data) => {
    try {
      const { id_conversation, id_sender, message_text } = data;
      
      // 1. Guardar el mensaje en la base de datos
      const newMessage = await createMessage(id_conversation, id_sender, message_text);

      // 2. Emitir el mensaje a todos en la sala (incluido el remitente)
      if (newMessage) {
        io.to(id_conversation).emit('receive_message', newMessage);
        console.log(`Mensaje emitido a la sala ${id_conversation}`);
      }
    } catch (error) {
      console.error("Error al procesar el mensaje:", error);
    }
  });
  
  // Notificar a un usuario sobre una nueva conversación
  socket.on('start_new_conversation', (data) => {
    // Esto es más complejo y requeriría mapear userIds a socketIds.
    // Por ahora, lo dejaremos para una futura mejora y nos basaremos en el polling para la lista de conversaciones.
  });

  // ==================== FIN LÓGICA DE WEBRTC ====================



  socket.on("disconnect", () => {

    // console.log("❌ Cliente desconectado:", socket.id);

    connectedUsers--;

    io.emit("usersCount", connectedUsers);



    if (socket.roomId) {

      socket.to(socket.roomId).emit('user-disconnected', socket.id);

      console.log(`Usuario ${socket.id} se desconectó de la sala de video ${socket.roomId}`);

    }

  });

});



// ==================== INICIAR SERVIDOR ====================

httpServer.listen(port, "0.0.0.0", () => {

  console.log(`🚀 Servidor Express y Socket.IO iniciado en el puerto ${port}`);

  console.log(`📍 Ambiente: ${process.env.NODE_ENV || "development"}`);

});



module.exports = app;