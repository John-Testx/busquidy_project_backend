const pool = require("../../db");
const { getActivePlan } = require("../../services/subscriptionService");
const { 
  getActiveSubscriptionByUserId, 
  cancelSubscriptionById, 
  getPlanBySubscriptionId 
} = require("../../queries/payment/subscriptionQueries");

/**
 * Obtener la suscripción activa O el plan gratuito por defecto del usuario
 */
const getActiveSubscription = async (req, res) => {
  let connection;
  try {
    const id_usuario = req.user.id_usuario;
    
    // 1. OBTENER CONEXIÓN Y TIPO_USUARIO
    connection = await pool.getConnection();
    const [userRows] = await connection.query("SELECT tipo_usuario FROM usuario WHERE id_usuario = ?", [id_usuario]);
    
    if (!userRows.length) {
       if (connection) connection.release();
       return res.status(404).json({ message: "Usuario no encontrado." });
    }
    const tipo_usuario = userRows[0].tipo_usuario;

    // 2. USAR EL SERVICIO QUE BUSCA PLAN DE PAGO O GRATUITO
    const plan = await getActivePlan(id_usuario, tipo_usuario);
    
    if (!plan) {
      // Esto solo pasaría si no hay ni plan de pago ni plan gratuito (raro)
      if (connection) connection.release();
      return res.status(404).json({ message: "No se encontró un plan activo." });
    }
    const subscription = await getActiveSubscriptionByUserId(id_usuario, connection);

    res.status(200).json({ 
      ...subscription, // Datos de la suscripción (o null si es gratis)
      id_plan: plan.id_plan, // Aseguramos el ID del plan
      estado: subscription ? subscription.estado : 'activa', // El plan gratuito siempre está 'activo'
      Plan: plan // Adjuntamos los detalles completos del plan
    });
    
  } catch (error) {
    console.error("Error al obtener la suscripción activa:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Cancelar la suscripción activa del usuario
 * (Esta función ya estaba correcta)
 */
const cancelActiveSubscription = async (req, res) => {
  let connection;
  try {
    const id_usuario = req.user.id_usuario;
    connection = await pool.getConnection();
    
    await connection.beginTransaction();
    
    const subscription = await getActiveSubscriptionByUserId(id_usuario, connection);
    
    if (!subscription) {
      await connection.rollback();
      return res.status(404).json({ error: "No se encontró una suscripción activa para cancelar." });
    }
    
    await cancelSubscriptionById(subscription.id_suscripcion, connection);

    try {
      const plan = await getPlanBySubscriptionId(subscription.id_suscripcion, connection);
      if (plan) {
        console.log(`Suscripción cancelada: Usuario ${id_usuario}, Plan ${plan.nombre}`);
      }
    } catch (notifyError) {
      console.warn("No se pudo enviar la notificación de cancelación:", notifyError);
    }

    await connection.commit();
    
    res.status(200).json({ message: "Suscripción cancelada exitosamente." });
  } catch (error) {
    console.error("Error al cancelar la suscripción:", error);
    if (connection) await connection.rollback();
    res.status(500).json({ error: "Error interno del servidor" });
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  getActivePlan,
  getActiveSubscription,
  cancelActiveSubscription,
};