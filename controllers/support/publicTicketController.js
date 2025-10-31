const ticketQueries = require("../../queries/support/ticketQueries");
const messageQueries = require("../../queries/support/messageQueries");

/**
 * Controlador para tickets públicos (sin autenticación)
 */

// Crear ticket anónimo (sin login)
const crearTicketPublico = async (req, res) => {
  try {
    const { asunto, categoria, prioridad, nombre_contacto, email_contacto, mensaje_inicial } = req.body;

    // Validaciones
    if (!asunto || asunto.trim() === "") {
      return res.status(400).json({ error: "El asunto es requerido" });
    }

    if (!email_contacto || !email_contacto.includes("@")) {
      return res.status(400).json({ error: "El email es requerido y debe ser válido" });
    }

    if (!mensaje_inicial || mensaje_inicial.trim() === "") {
      return res.status(400).json({ error: "El mensaje inicial es requerido" });
    }

    // Crear ticket anónimo
    const id_ticket = await ticketQueries.insertPublicTicket(
      asunto,
      categoria || 'Otro',
      prioridad || 'media',
      email_contacto,
      email_contacto
    );

    // Insertar mensaje inicial
    await messageQueries.insertPublicMessage(id_ticket, mensaje_inicial);

    res.status(201).json({
      message: "Ticket creado exitosamente",
      id_ticket: id_ticket,
      codigo_seguimiento: `TK-${id_ticket}-${Date.now().toString().slice(-6)}`
    });
  } catch (error) {
    console.error("Error al crear ticket público:", error);
    res.status(500).json({ error: "Error al crear el ticket" });
  }
};

// Obtener ticket por email (para usuarios no autenticados)
const obtenerTicketsPorEmail = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Email válido requerido" });
    }

    const tickets = await ticketQueries.findTicketsByEmail(email);
    res.json(tickets);
  } catch (error) {
    console.error("Error al obtener tickets por email:", error);
    res.status(500).json({ error: "Error al obtener los tickets" });
  }
};

// Obtener ticket público por ID y email (verificación de propiedad)
const obtenerTicketPublico = async (req, res) => {
  try {
    const { id_ticket } = req.params;
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ error: "Email requerido" });
    }

    const ticket = await ticketQueries.findPublicTicketById(id_ticket, email);

    if (!ticket) {
      return res.status(404).json({ error: "Ticket no encontrado" });
    }

    res.json(ticket);
  } catch (error) {
    console.error("Error al obtener ticket público:", error);
    res.status(500).json({ error: "Error al obtener el ticket" });
  }
};

// Obtener mensajes de ticket público
const obtenerMensajesPublico = async (req, res) => {
  try {
    const { id_ticket } = req.params;
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ error: "Email requerido" });
    }

    // Verificar que el ticket pertenece al email
    const isOwner = await ticketQueries.verifyPublicTicketOwnership(id_ticket, email);

    if (!isOwner) {
      return res.status(404).json({ error: "Ticket no encontrado" });
    }

    const mensajes = await messageQueries.findPublicMessagesByTicket(id_ticket);
    res.json(mensajes);
  } catch (error) {
    console.error("Error al obtener mensajes públicos:", error);
    res.status(500).json({ error: "Error al obtener los mensajes" });
  }
};

// Enviar mensaje en ticket público
const enviarMensajePublico = async (req, res) => {
  try {
    const { id_ticket } = req.params;
    const { mensaje, email } = req.body;

    if (!mensaje || mensaje.trim() === "") {
      return res.status(400).json({ error: "El mensaje no puede estar vacío" });
    }

    if (!email) {
      return res.status(400).json({ error: "Email requerido" });
    }

    // Verificar que el ticket existe y pertenece al email
    const ticketStatus = await ticketQueries.getPublicTicketStatus(id_ticket, email);

    if (!ticketStatus) {
      return res.status(404).json({ error: "Ticket no encontrado" });
    }

    if (ticketStatus.estado === 'cerrado') {
      return res.status(400).json({ error: "No se pueden enviar mensajes a tickets cerrados" });
    }

    await messageQueries.insertPublicMessage(id_ticket, mensaje);

    res.status(201).json({ message: "Mensaje enviado correctamente" });
  } catch (error) {
    console.error("Error al enviar mensaje público:", error);
    res.status(500).json({ error: "Error al enviar el mensaje" });
  }
};

module.exports = {
  crearTicketPublico,
  obtenerTicketsPorEmail,
  obtenerTicketPublico,
  obtenerMensajesPublico,
  enviarMensajePublico
};