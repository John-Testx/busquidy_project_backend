// backend/config/socket.js
const socketIo = require("socket.io");

let io;

module.exports = {
  init: (httpServer, corsOptions) => {
    io = new socketIo.Server(httpServer, {
      cors: corsOptions,
    });
    return io;
  },
  getIO: () => {
    if (!io) {
      throw new Error("Socket.io no ha sido inicializado!");
    }
    return io;
  },
};