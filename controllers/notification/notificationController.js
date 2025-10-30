const {
  findNotificationsByUser,
  findNotificationById,
  markAsRead,
  markAllAsRead,
  countUnreadNotifications,
  deleteNotification
} = require("../../queries/notification/notificationQueries");

/**
 * Controlador de notificaciones
 */

/**
 * Obtener todas las notificaciones del usuario autenticado
 */
const obtenerNotificaciones = async (req, res) => {
  try {
    const { id_usuario } = req.user;
    const { solo_no_leidas } = req.query;

    const notificaciones = await findNotificationsByUser(
      id_usuario,
      solo_no_leidas === 'true'
    );

    res.json({
      notificaciones,
      total: notificaciones.length
    });
  } catch (error) {
    console.error("Error al obtener notificaciones:", error);
    res.status(500).json({ error: "Error al obtener las notificaciones" });
  }
};

/**
 * Obtener el contador de notificaciones no leídas
 */
const obtenerContadorNoLeidas = async (req, res) => {
  try {
    const { id_usuario } = req.user;
    const count = await countUnreadNotifications(id_usuario);
    
    res.json({ count });
  } catch (error) {
    console.error("Error al contar notificaciones:", error);
    res.status(500).json({ error: "Error al contar las notificaciones" });
  }
};

/**
 * Marcar una notificación como leída
 */
const marcarComoLeida = async (req, res) => {
  try {
    const { id_notificacion } = req.params;
    const { id_usuario } = req.user;

    // Verificar que la notificación pertenece al usuario
    const notificacion = await findNotificationById(id_notificacion);
    
    if (!notificacion) {
      return res.status(404).json({ error: "Notificación no encontrada" });
    }

    if (notificacion.id_usuario_receptor !== id_usuario) {
      return res.status(403).json({ error: "No tienes permiso para modificar esta notificación" });
    }

    await markAsRead(id_notificacion);
    
    res.json({ message: "Notificación marcada como leída" });
  } catch (error) {
    console.error("Error al marcar notificación:", error);
    res.status(500).json({ error: "Error al marcar la notificación" });
  }
};

/**
 * Marcar todas las notificaciones como leídas
 */
const marcarTodasComoLeidas = async (req, res) => {
  try {
    const { id_usuario } = req.user;
    const count = await markAllAsRead(id_usuario);
    
    res.json({ 
      message: "Todas las notificaciones marcadas como leídas",
      count 
    });
  } catch (error) {
    console.error("Error al marcar notificaciones:", error);
    res.status(500).json({ error: "Error al marcar las notificaciones" });
  }
};

/**
 * Eliminar una notificación
 */
const eliminarNotificacion = async (req, res) => {
  try {
    const { id_notificacion } = req.params;
    const { id_usuario } = req.user;

    // Verificar que la notificación pertenece al usuario
    const notificacion = await findNotificationById(id_notificacion);
    
    if (!notificacion) {
      return res.status(404).json({ error: "Notificación no encontrada" });
    }

    if (notificacion.id_usuario_receptor !== id_usuario) {
      return res.status(403).json({ error: "No tienes permiso para eliminar esta notificación" });
    }

    await deleteNotification(id_notificacion);
    
    res.json({ message: "Notificación eliminada" });
  } catch (error) {
    console.error("Error al eliminar notificación:", error);
    res.status(500).json({ error: "Error al eliminar la notificación" });
  }
};

module.exports = {
  obtenerNotificaciones,
  obtenerContadorNoLeidas,
  marcarComoLeida,
  marcarTodasComoLeidas,
  eliminarNotificacion
};