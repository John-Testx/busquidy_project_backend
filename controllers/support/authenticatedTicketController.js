const ticketQueries = require("../../queries/support/ticketQueries");
const messageQueries = require("../../queries/support/messageQueries");
const adminQueries = require("../../queries/support/adminQueries");

/**
 * Controlador para tickets autenticados
 */

// Crear ticket autenticado
const crearTicket = async (req, res) => {
  try {
    const { id_usuario } = req.user;
    const { asunto, categoria, prioridad, mensaje_inicial } = req.body;

    if (!asunto || asunto.trim() === "") {
      return res.status(400).json({ error: "El asunto es requerido" });
    }

    const id_ticket = await ticketQueries.insertAuthenticatedTicket(
      id_usuario,
      asunto,
      categoria || 'Otro',
      prioridad || 'media'
    );

    // Si hay mensaje inicial, insertarlo
    if (mensaje_inicial && mensaje_inicial.trim() !== "") {
      await messageQueries.insertAuthenticatedMessage(
        id_ticket,
        id_usuario,
        null,
        mensaje_inicial,
        'usuario'
      );
    }

    res.status(201).json({
      message: "Ticket creado exitosamente",
      id_ticket: id_ticket
    });
  } catch (error) {
    console.error("Error al crear ticket:", error);
    res.status(500).json({ error: "Error al crear el ticket" });
  }
};

// Listar tickets del usuario autenticado
const obtenerTicketsUsuario = async (req, res) => {
  try {
    const { id_usuario, tipo_usuario } = req.user;

    let tickets;

    if (tipo_usuario === "administrador") {
      // Admin ve todos los tickets
      tickets = await ticketQueries.findAllTicketsForAdmin();
    } else {
      // Usuario regular solo ve sus tickets
      tickets = await ticketQueries.findTicketsByUserId(id_usuario);
    }

    res.json(tickets);
  } catch (error) {
    console.error("Error al obtener tickets:", error);
    res.status(500).json({ error: "Error al obtener los tickets" });
  }
};

// Obtener ticket individual
const obtenerTicket = async (req, res) => {
  try {
    const { id_ticket } = req.params;
    const { id_usuario, tipo_usuario } = req.user;

    const ticket = await ticketQueries.findTicketByIdWithDetails(id_ticket);

    if (!ticket) {
      return res.status(404).json({ error: "Ticket no encontrado" });
    }

    if (tipo_usuario !== "administrador" && ticket.id_usuario !== id_usuario) {
      return res.status(403).json({ error: "No tienes permiso para ver este ticket" });
    }

    res.json(ticket);
  } catch (error) {
    console.error("Error al obtener ticket:", error);
    res.status(500).json({ error: "Error al obtener el ticket" });
  }
};

// Obtener mensajes de un ticket
const obtenerMensajes = async (req, res) => {
  try {
    const { id_ticket } = req.params;
    const { id_usuario, tipo_usuario } = req.user;

    const ticketOwner = await ticketQueries.findTicketOwner(id_ticket);

    if (!ticketOwner) {
      return res.status(404).json({ error: "Ticket no encontrado" });
    }

    if (tipo_usuario !== "administrador" && ticketOwner.id_usuario !== id_usuario) {
      return res.status(403).json({ error: "No tienes permiso para ver estos mensajes" });
    }

    const mensajes = await messageQueries.findMessagesByTicket(id_ticket);
    res.json(mensajes);
  } catch (error) {
    console.error("Error al obtener mensajes:", error);
    res.status(500).json({ error: "Error al obtener los mensajes del ticket" });
  }
};

// Enviar mensaje a un ticket
const enviarMensaje = async (req, res) => {
  try {
    const { id_ticket } = req.params;
    const { mensaje } = req.body;
    const { id_usuario, tipo_usuario } = req.user;

    if (!mensaje || mensaje.trim() === "") {
      return res.status(400).json({ error: "El mensaje no puede estar vacío" });
    }

    const ticket = await ticketQueries.findTicketStatusById(id_ticket);

    if (!ticket) {
      return res.status(404).json({ error: "Ticket no encontrado" });
    }

    if (tipo_usuario !== "administrador" && ticket.id_usuario !== id_usuario) {
      return res.status(403).json({ error: "No tienes permiso para enviar mensajes a este ticket" });
    }

    if (ticket.estado === 'cerrado') {
      return res.status(400).json({ error: "No se pueden enviar mensajes a tickets cerrados" });
    }

    const remitente = tipo_usuario === "administrador" ? "administrador" : "usuario";

    let id_admin = null;
    let id_user = null;

    if (remitente === "administrador") {
      // Obtener el id_administrador real desde la tabla administrador
      id_admin = await adminQueries.findAdminIdByUserId(id_usuario);

      if (!id_admin) {
        return res.status(404).json({ error: "Administrador no encontrado" });
      }
    } else {
      id_user = id_usuario;
    }

    await messageQueries.insertAuthenticatedMessage(
      id_ticket,
      id_user,
      id_admin,
      mensaje,
      remitente
    );

    // Si el admin responde y el ticket está pendiente, cambiar a "en proceso"
    if (remitente === "administrador" && ticket.estado === 'pendiente') {
      await ticketQueries.updateTicketStatus(id_ticket, 'en proceso');
    }

    res.status(201).json({ message: "Mensaje enviado correctamente" });
  } catch (error) {
    console.error("Error al enviar mensaje:", error);
    res.status(500).json({ error: "Error al enviar el mensaje" });
  }
};

// Actualizar estado del ticket
const actualizarEstadoTicket = async (req, res) => {
  try {
    const { id_ticket } = req.params;
    const { estado } = req.body;
    const { tipo_usuario } = req.user;

    if (tipo_usuario !== "administrador") {
      return res.status(403).json({ error: "Solo administradores pueden cambiar el estado" });
    }

    const estadosValidos = ['pendiente', 'en proceso', 'resuelto', 'cerrado'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ error: "Estado inválido" });
    }

    await ticketQueries.updateTicketStatus(id_ticket, estado);

    res.json({ message: "Estado actualizado correctamente" });
  } catch (error) {
    console.error("Error al actualizar estado:", error);
    res.status(500).json({ error: "Error al actualizar el estado" });
  }
};

// Asignar ticket a un administrador
const asignarTicket = async (req, res) => {
  try {
    const { id_ticket } = req.params;
    const { id_admin_asignado } = req.body;
    const { tipo_usuario } = req.user;

    if (tipo_usuario !== "administrador") {
      return res.status(403).json({ error: "Solo administradores pueden asignar tickets" });
    }

    await ticketQueries.assignTicketToAdmin(id_ticket, id_admin_asignado);

    res.json({ message: "Ticket asignado correctamente" });
  } catch (error) {
    console.error("Error al asignar ticket:", error);
    res.status(500).json({ error: "Error al asignar el ticket" });
  }
};

module.exports = {
  crearTicket,
  obtenerTicketsUsuario,
  obtenerTicket,
  obtenerMensajes,
  enviarMensaje,
  actualizarEstadoTicket,
  asignarTicket
};