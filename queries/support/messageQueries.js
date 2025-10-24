const pool = require("../../db");

/**
 * Queries relacionadas con mensajes de tickets de soporte
 */

// ============= QUERIES PÚBLICAS =============

const insertPublicMessage = async (id_ticket, mensaje) => {
  await pool.query(
    `INSERT INTO soporte_mensaje (id_ticket, id_usuario, id_admin, mensaje, remitente)
     VALUES (?, NULL, NULL, ?, 'usuario')`,
    [id_ticket, mensaje]
  );
};

const findPublicMessagesByTicket = async (id_ticket) => {
  const [mensajes] = await pool.query(
    `SELECT 
      m.*,
      CASE 
        WHEN m.remitente = 'administrador' THEN a.nombre_completo
        ELSE 'Tú'
      END as nombre_remitente
     FROM soporte_mensaje m
     LEFT JOIN administrador a ON m.id_admin = a.id_administrador
     WHERE m.id_ticket = ? 
     ORDER BY m.fecha_envio ASC`,
    [id_ticket]
  );
  return mensajes;
};

// ============= QUERIES AUTENTICADAS =============

const insertAuthenticatedMessage = async (id_ticket, id_usuario, id_admin, mensaje, remitente) => {
  await pool.query(
    `INSERT INTO soporte_mensaje (id_ticket, id_usuario, id_admin, mensaje, remitente)
     VALUES (?, ?, ?, ?, ?)`,
    [id_ticket, id_usuario, id_admin, mensaje, remitente]
  );
};

const findMessagesByTicket = async (id_ticket) => {
  const [mensajes] = await pool.query(
    `SELECT 
      m.*,
      CASE 
        WHEN m.remitente = 'usuario' THEN 
          COALESCE(
            ap.nombres, 
            e.nombre_empresa, 
            u.correo
          )
        WHEN m.remitente = 'administrador' THEN a.nombre_completo
      END AS nombre_remitente
    FROM soporte_mensaje m
    LEFT JOIN usuario u ON m.id_usuario = u.id_usuario
    LEFT JOIN administrador a ON m.id_admin = a.id_administrador
    LEFT JOIN freelancer f ON u.id_usuario = f.id_usuario
    LEFT JOIN antecedentes_personales ap ON f.id_freelancer = ap.id_freelancer
    LEFT JOIN empresa e ON u.id_usuario = e.id_usuario
    WHERE m.id_ticket = ?
    ORDER BY m.fecha_envio ASC`,
    [id_ticket]
  );
  return mensajes;
};

module.exports = {
  // Públicas
  insertPublicMessage,
  findPublicMessagesByTicket,
  // Autenticadas
  insertAuthenticatedMessage,
  findMessagesByTicket
};