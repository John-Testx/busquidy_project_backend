const ticketQueries = require("../../queries/support/ticketQueries");
const messageQueries = require("../../queries/support/messageQueries");
const verificationQueries = require("../../queries/support/verificationQueries");
const emailService = require("../../services/emailService");
const dns = require('dns').promises; // <--- 1. IMPORTAMOS EL MÓDULO DNS DE NODE

const generarCodigo = () => Math.floor(100000 + Math.random() * 900000).toString();

/**
 * Helper para verificar el dominio del email usando registros MX
 */
const verifyEmailDomain = async (email) => {
  try {
    const domain = email.split('@')[1];
    if (!domain) return false;

    // resolveMx intentará encontrar servidores de correo para el dominio
    const addresses = await dns.resolveMx(domain);
    
    // Si encuentra al menos una dirección, el dominio es válido
    return addresses && addresses.length > 0;

  } catch (error) {
    // Si el dominio no existe (ENOTFOUND) o no tiene registros MX (ENODATA),
    // el error nos lo dice, y devolvemos 'false'.
    console.warn(`Fallo en la verificación de DNS para ${email}: ${error.code}`);
    return false;
  }
};

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

// Enviar código de verificación para soporte público
const enviarCodigoSoporte = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Email válido requerido" });
    }
    
    console.log(`Verificando dominio para: ${email}`);
    const isDomainValid = await verifyEmailDomain(email);

    if (!isDomainValid) {
      console.warn(`Email rechazado: Dominio inválido o sin servidor de correo para ${email}`);
      return res.status(400).json({ error: "El dominio del correo no parece ser válido" });
    }

    const codigo = generarCodigo();

    // 1. Guardar código en la DB
    await verificationQueries.insertVerificationCode(email, codigo);

    // 2. Enviar email con Mailgun
    await emailService.sendSupportVerificationCode(email, codigo);

    res.status(200).json({ message: "Código de verificación enviado" });

  } catch (error) {
    console.error("Error al enviar código de soporte:", error);
    res.status(500).json({ error: "Error al enviar el código" });
  }
};

// Verificar código de soporte público
const verificarCodigoSoporte = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: "Email y código son requeridos" });
    }

    // 1. Buscar código válido en la DB
    const esValido = await verificationQueries.findValidCode(email, code);

    if (!esValido) {
      return res.status(400).json({ error: "Código incorrecto o expirado" });
    }

    await verificationQueries.deleteCode(email, code);

    res.status(200).json({ 
        message: "Email verificado correctamente",
        email: email // Devolvemos el email para confirmar
    });

  } catch (error) {
    console.error("Error al verificar código de soporte:", error);
    res.status(500).json({ error: "Error al verificar el código" });
  }
};

module.exports = {
  crearTicketPublico,
  obtenerTicketsPorEmail,
  obtenerTicketPublico,
  obtenerMensajesPublico,
  enviarMensajePublico,
  enviarCodigoSoporte,   
  verificarCodigoSoporte  
};