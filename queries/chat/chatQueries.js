const pool = require("../../db");

/**
* Iniciar una nueva conversación o encontrar una existente.
 */

const startConversation = async (id_user_one, id_user_two) => {
  // Ordenar IDs para consistencia en la base de datos
  const [user1, user2] = [id_user_one, id_user_two].sort((a, b) => a - b);

  // 1. Buscar si la conversación ya existe
  let [existing] = await pool.query(
    "SELECT id_conversation FROM conversations WHERE id_user_one = ? AND id_user_two = ?",
    [user1, user2]
  );
  
  let conversationId;

  if (existing.length > 0) {
    // Si ya existe, usamos su ID
    conversationId = existing[0].id_conversation;
  } else {
    // Si no existe, la creamos y obtenemos el nuevo ID
    const [result] = await pool.query(
      "INSERT INTO conversations (id_user_one, id_user_two) VALUES (?, ?)",
      [user1, user2]
    );
    conversationId = result.insertId;
  }
  
  // 2. AHORA, usamos el ID para obtener y devolver la conversación COMPLETA
  const [fullConversation] = await pool.query(
    `SELECT 
        c.id_conversation,
        u1.id_usuario AS user_one_id,
        u1.correo AS user_one_email,
        u1.tipo_usuario AS user_one_type,
        u2.id_usuario AS user_two_id,
        u2.correo AS user_two_email,
        u2.tipo_usuario AS user_two_type,
        (SELECT message_text FROM messages WHERE id_conversation = c.id_conversation ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM messages WHERE id_conversation = c.id_conversation ORDER BY created_at DESC LIMIT 1) as last_message_time
      FROM conversations c
      JOIN usuario u1 ON c.id_user_one = u1.id_usuario
      JOIN usuario u2 ON c.id_user_two = u2.id_usuario
      WHERE c.id_conversation = ?`,
    [conversationId]
  );

  return fullConversation[0]; // Devolver el objeto de la conversación recién creada o encontrada
};

/**
 * Obtener las conversaciones de un usuario.
 */
const getConversations = async (userId) => {
  const [conversations] = await pool.query(`
    SELECT 
      c.id_conversation,
      u1.id_usuario AS user_one_id,
      u1.correo AS user_one_email,
      u1.tipo_usuario AS user_one_type,
      u2.id_usuario AS user_two_id,
      u2.correo AS user_two_email,
      u2.tipo_usuario AS user_two_type,
      (SELECT message_text FROM messages WHERE id_conversation = c.id_conversation ORDER BY created_at DESC LIMIT 1) as last_message,
      (SELECT created_at FROM messages WHERE id_conversation = c.id_conversation ORDER BY created_at DESC LIMIT 1) as last_message_time
    FROM conversations c
    JOIN usuario u1 ON c.id_user_one = u1.id_usuario
    JOIN usuario u2 ON c.id_user_two = u2.id_usuario
    WHERE c.id_user_one = ? OR c.id_user_two = ?
    ORDER BY last_message_time DESC
  `, [userId, userId]);

  return conversations;
};

/**
 * Obtener los mensajes de una conversación.
 */
const getMessages = async (id_conversation) => {
  const [messages] = await pool.query(
    "SELECT * FROM messages WHERE id_conversation = ? ORDER BY created_at ASC",
    [id_conversation]
  );
  return messages;
};

/**
 * Guardar un nuevo mensaje.
 */
const createMessage = async (id_conversation, id_sender, message_text) => {
  const [result] = await pool.query(
    "INSERT INTO messages (id_conversation, id_sender, message_text) VALUES (?, ?, ?)",
    [id_conversation, id_sender, message_text]
  );
  const [newMessage] = await pool.query(
    "SELECT * FROM messages WHERE id_message = ?",
    [result.insertId]
  );
  return newMessage[0];
};

/**
 * Obtener usuarios con los que se puede chatear.
 * Un freelancer puede chatear con empresas y viceversa.
 */
const getUsersForChat = async (userId, userType) => {
  const targetType = userType === 'freelancer' ? 'empresa' : 'freelancer';
  
  const [users] = await pool.query(
    "SELECT id_usuario, correo, tipo_usuario FROM usuario WHERE tipo_usuario = ? AND id_usuario != ?",
    [targetType, userId]
  );
  
  return users;
};

/** Verificar si dos usuarios tienen permiso para chatear.
 * Un freelancer y una empresa pueden chatear si:
 * - Tienen una solicitud de chat aceptada, o
 * - Tienen una postulación aceptada o en proceso entre ellos.
 */

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



module.exports = {
  startConversation,
  getConversations,
  getMessages,
  createMessage,
  getUsersForChat,
  verificarPermisoChat
};