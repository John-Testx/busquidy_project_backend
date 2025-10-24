const pool = require("../../db");
/**
 * Queries relacionadas con tickets de soporte
 */

// ============= QUERIES PÚBLICAS =============

const insertPublicTicket = async (asunto, categoria, prioridad, nombre_contacto, email_contacto) => {
  const [result] = await pool.query(
    `INSERT INTO soporte_ticket 
      (id_usuario, asunto, categoria, prioridad, nombre_contacto, email_contacto, es_anonimo)
     VALUES (NULL, ?, ?, ?, ?, ?, TRUE)`,
    [asunto, categoria, prioridad, nombre_contacto, email_contacto]
  );
  return result.insertId;
};

const findTicketsByEmail = async (email) => {
  const [tickets] = await pool.query(
    `SELECT * FROM soporte_ticket 
     WHERE email_contacto = ? AND es_anonimo = TRUE
     ORDER BY fecha_creacion DESC`,
    [email]
  );
  return tickets;
};

const findPublicTicketById = async (id_ticket, email) => {
  const [tickets] = await pool.query(
    `SELECT * FROM soporte_ticket 
     WHERE id_ticket = ? AND email_contacto = ? AND es_anonimo = TRUE`,
    [id_ticket, email]
  );
  return tickets[0] || null;
};

const verifyPublicTicketOwnership = async (id_ticket, email) => {
  const [tickets] = await pool.query(
    `SELECT id_ticket FROM soporte_ticket 
     WHERE id_ticket = ? AND email_contacto = ? AND es_anonimo = TRUE`,
    [id_ticket, email]
  );
  return tickets.length > 0;
};

const getPublicTicketStatus = async (id_ticket, email) => {
  const [tickets] = await pool.query(
    `SELECT estado, email_contacto FROM soporte_ticket 
     WHERE id_ticket = ? AND email_contacto = ? AND es_anonimo = TRUE`,
    [id_ticket, email]
  );
  return tickets[0] || null;
};

// ============= QUERIES AUTENTICADAS =============

const insertAuthenticatedTicket = async (id_usuario, asunto, categoria, prioridad) => {
  const [result] = await pool.query(
    `INSERT INTO soporte_ticket (id_usuario, asunto, categoria, prioridad, es_anonimo)
     VALUES (?, ?, ?, ?, FALSE)`,
    [id_usuario, asunto, categoria, prioridad]
  );
  return result.insertId;
};

const findAllTicketsForAdmin = async () => {
  const [tickets] = await pool.query(
    `SELECT 
      t.*,
      COALESCE(
        a.nombre_completo,
        CONCAT(ap.nombres, ' ', ap.apellidos),
        e.nombre_empresa,
        t.nombre_contacto,
        'Anónimo'
      ) AS nombre_usuario,
      COALESCE(
        u.correo,
        f.correo_contacto,
        e.correo_empresa,
        t.email_contacto
      ) AS email_usuario
    FROM soporte_ticket t
    LEFT JOIN usuario u ON t.id_usuario = u.id_usuario
    LEFT JOIN administrador a ON u.id_usuario = a.id_usuario
    LEFT JOIN freelancer f ON u.id_usuario = f.id_usuario
    LEFT JOIN antecedentes_personales ap ON f.id_freelancer = ap.id_freelancer
    LEFT JOIN empresa e ON u.id_usuario = e.id_usuario
    ORDER BY 
      CASE 
        WHEN t.prioridad = 'alta' THEN 1
        WHEN t.prioridad = 'media' THEN 2
        WHEN t.prioridad = 'baja' THEN 3
      END,
      t.fecha_creacion DESC`
  );
  return tickets;
};

const findTicketsByUserId = async (id_usuario) => {
  const [tickets] = await pool.query(
    `SELECT 
      t.*,
      COALESCE(
        t.nombre_contacto,
        'Usuario'
      ) AS nombre_usuario
    FROM soporte_ticket t
    WHERE t.id_usuario = ? AND t.es_anonimo = FALSE
    ORDER BY t.fecha_creacion DESC`,
    [id_usuario]
  );
  return tickets;
};

const findTicketByIdWithDetails = async (id_ticket) => {
  const [tickets] = await pool.query(
    `SELECT 
      t.*,
      COALESCE(
        a.nombre_completo,
        CONCAT(ap.nombres, ' ', ap.apellidos),
        e.nombre_empresa,
        t.nombre_contacto,
        'Anónimo'
      ) AS nombre_usuario,
      COALESCE(
        u.correo,
        f.correo_contacto,
        e.correo_empresa,
        t.email_contacto
      ) AS email_usuario,
      adm.nombre_completo AS nombre_admin
    FROM soporte_ticket t
    LEFT JOIN usuario u ON t.id_usuario = u.id_usuario
    LEFT JOIN administrador a ON u.id_usuario = a.id_usuario
    LEFT JOIN freelancer f ON u.id_usuario = f.id_usuario
    LEFT JOIN antecedentes_personales ap ON f.id_freelancer = ap.id_freelancer
    LEFT JOIN empresa e ON u.id_usuario = e.id_usuario
    LEFT JOIN administrador adm ON t.id_admin_asignado = adm.id_administrador
    WHERE t.id_ticket = ?`,
    [id_ticket]
  );
  return tickets[0] || null;
};

const findTicketOwner = async (id_ticket) => {
  const [tickets] = await pool.query(
    `SELECT id_usuario FROM soporte_ticket WHERE id_ticket = ?`,
    [id_ticket]
  );
  return tickets[0] || null;
};

const findTicketStatusById = async (id_ticket) => {
  const [tickets] = await pool.query(
    `SELECT id_usuario, estado FROM soporte_ticket WHERE id_ticket = ?`,
    [id_ticket]
  );
  return tickets[0] || null;
};

const updateTicketStatus = async (id_ticket, estado) => {
  await pool.query(
    `UPDATE soporte_ticket SET estado = ? WHERE id_ticket = ?`,
    [estado, id_ticket]
  );
};

const assignTicketToAdmin = async (id_ticket, id_admin_asignado) => {
  await pool.query(
    `UPDATE soporte_ticket SET id_admin_asignado = ? WHERE id_ticket = ?`,
    [id_admin_asignado, id_ticket]
  );
};

module.exports = {
  // Públicas
  insertPublicTicket,
  findTicketsByEmail,
  findPublicTicketById,
  verifyPublicTicketOwnership,
  getPublicTicketStatus,
  // Autenticadas
  insertAuthenticatedTicket,
  findAllTicketsForAdmin,
  findTicketsByUserId,
  findTicketByIdWithDetails,
  findTicketOwner,
  findTicketStatusById,
  updateTicketStatus,
  assignTicketToAdmin
};