const { insertNotification } = require("../queries/notification/notificationQueries");
const pool = require("../db");

/**
 * Servicio centralizado para crear notificaciones
 * Este servicio encapsula toda la lógica de creación de notificaciones
 */

/**
 * Crear una notificación genérica
 * @param {Object} data - Datos de la notificación
 * @param {number} data.id_usuario_receptor - ID del usuario que recibe
 * @param {string} data.tipo_notificacion - Tipo de notificación
 * @param {string} data.mensaje - Mensaje personalizado
 * @param {string|null} data.enlace - Enlace opcional para redirección
 * @param {Object} connection - Conexión de BD (para transacciones)
 * @returns {Promise<number>} ID de la notificación creada
 */
const crearNotificacion = async (data, connection = null) => {
  try {
    const db = connection || pool;
    const id_notificacion = await insertNotification(data, db);
    console.log(`✅ Notificación creada: ${data.tipo_notificacion} para usuario ${data.id_usuario_receptor}`);
    return id_notificacion;
  } catch (error) {
    console.error("❌ Error al crear notificación:", error);
    throw error;
  }
};

// ==================== FREELANCER NOTIFICATIONS ====================

/**
 * Notificar al freelancer que su postulación fue recibida
 */
const notificarPostulacionRecibida = async (id_freelancer_usuario, nombre_proyecto, id_publicacion, connection = null) => {
  return await crearNotificacion({
    id_usuario_receptor: id_freelancer_usuario,
    tipo_notificacion: "postulacion_recibida",
    mensaje: `Tu postulación al proyecto '${nombre_proyecto}' ha sido enviada.`,
    enlace: `/empresa/proyectos/${id_publicacion}`
  }, connection);
};

/**
 * Notificar al freelancer que su postulación fue aceptada
 */
const notificarPostulacionAceptada = async (id_freelancer_usuario, nombre_proyecto, id_publicacion, connection = null) => {
  return await crearNotificacion({
    id_usuario_receptor: id_freelancer_usuario,
    tipo_notificacion: "postulacion_aceptada",
    mensaje: `¡Felicitaciones! Has sido aceptado para el proyecto '${nombre_proyecto}'.`,
    enlace: "/freelancer-profile/my-postulations"
  }, connection);
};

/**
 * Notificar al freelancer que su postulación fue rechazada
 */
const notificarPostulacionRechazada = async (id_freelancer_usuario, nombre_proyecto, connection = null) => {
  return await crearNotificacion({
    id_usuario_receptor: id_freelancer_usuario,
    tipo_notificacion: "postulacion_rechazada",
    mensaje: `Tu postulación para '${nombre_proyecto}' fue rechazada por la empresa.`,
    enlace: "/freelancer-profile/my-postulations"
  }, connection);
};

/**
 * Notificar al freelancer que recibió una solicitud de chat
 */
const notificarSolicitudChatRecibida = async (id_freelancer_usuario, nombre_empresa, id_solicitud, connection = null) => {
  return await crearNotificacion({
    id_usuario_receptor: id_freelancer_usuario,
    tipo_notificacion: "solicitud_chat_recibida",
    mensaje: `La Empresa '${nombre_empresa}' quiere chatear contigo sobre tu postulación.`,
    enlace: `/chat/${id_solicitud}` // Mas adelante me deberia de redirigir a la conversacion de chat`/solicitudes/${id_solicitud}` 
  }, connection);
};

/**
 * Notificar al freelancer que recibió una solicitud de entrevista
 */
const notificarSolicitudEntrevistaRecibida = async (id_freelancer_usuario, nombre_empresa, nombre_proyecto, fecha_sugerida, id_solicitud, connection = null) => {
  const fechaFormateada = fecha_sugerida ? new Date(fecha_sugerida).toLocaleDateString('es-CL') : '';
  return await crearNotificacion({
    id_usuario_receptor: id_freelancer_usuario,
    tipo_notificacion: "solicitud_entrevista_recibida",
    mensaje: `'${nombre_empresa}' te ha invitado a una entrevista para el proyecto '${nombre_proyecto}'${fechaFormateada ? ` el ${fechaFormateada}` : ''}.`,
    enlace: `/interview/request/${id_solicitud}` // deberia de redigir a un modal o interfaz.
  }, connection);
};

/**
 * Notificar al freelancer que se liberó un pago
 */
const notificarPagoLiberado = async (id_freelancer_usuario, nombre_empresa, monto, nombre_proyecto, id_pago, connection = null) => {
  return await crearNotificacion({
    id_usuario_receptor: id_freelancer_usuario,
    tipo_notificacion: "pago_liberado",
    mensaje: `'${nombre_empresa}' ha liberado tu pago de $${monto.toLocaleString('es-CL')} por el proyecto '${nombre_proyecto}'.`,
    enlace: `/empresa/proyectos/${id_publicacion}` 
  }, connection);
};

/**
 * Notificar al freelancer que recibió un nuevo mensaje
 */
const notificarNuevoMensaje = async (id_receptor, nombre_remitente, id_conversacion, connection = null) => {
  return await crearNotificacion({
    id_usuario_receptor: id_receptor,
    tipo_notificacion: "nuevo_mensaje",
    mensaje: `Tienes un nuevo mensaje de '${nombre_remitente}'.`,
    enlace: `/chat/`
  }, connection);
};

/**
 * Notificar al freelancer que recibió una reseña
 */
const notificarNuevaResenaRecibida = async (id_receptor, nombre_quien_resena, calificacion, id_resena, connection = null) => {
  return await crearNotificacion({
    id_usuario_receptor: id_receptor,
    tipo_notificacion: "nueva_resena_recibida",
    mensaje: `'${nombre_quien_resena}' te ha dejado una reseña de ${calificacion} estrellas.`,
    enlace: `/perfil/resenas`
  }, connection);
};

// ==================== EMPRESA NOTIFICATIONS ====================

/**
 * Notificar a la empresa que recibió una nueva postulación
 */
const notificarNuevaPostulacion = async (id_empresa_usuario, nombre_freelancer, nombre_proyecto, id_postulacion, id_proyecto, connection = null) => {
  return await crearNotificacion({
    id_usuario_receptor: id_empresa_usuario,
    tipo_notificacion: "nueva_postulacion",
    mensaje: `'${nombre_freelancer}' ha postulado a tu proyecto '${nombre_proyecto}'.`,
    enlace: `/empresa/proyectos/${id_proyecto}` 
  }, connection);
};

/**
 * Notificar a la empresa que creó un proyecto exitosamente
 */
const notificarProyectoCreadoExitoso = async (id_empresa_usuario, nombre_proyecto, id_proyecto, connection = null) => {
  return await crearNotificacion({
    id_usuario_receptor: id_empresa_usuario,
    tipo_notificacion: "proyecto_creado_exitoso",
    mensaje: `Tu proyecto '${nombre_proyecto}' se creó exitosamente. ¡Ya puedes publicarlo!`,
    enlace: `/myprojects/${id_proyecto}`
  }, connection);
};

/**
 * Notificar a la empresa que el pago del proyecto fue exitoso
 */
const notificarProyectoPagoExitoso = async (id_empresa_usuario, nombre_proyecto, id_proyecto, connection = null) => {
  return await crearNotificacion({
    id_usuario_receptor: id_empresa_usuario,
    tipo_notificacion: "proyecto_pago_exitoso",
    mensaje: `El pago para publicar tu proyecto '${nombre_proyecto}' fue exitoso.`,
    enlace: `/empresa/proyectos/${id_proyecto}`
  }, connection);
};

/**
 * Notificar a la empresa que el proyecto fue finalizado
 */
const notificarProyectoFinalizado = async (id_empresa_usuario, nombre_freelancer, nombre_proyecto, id_proyecto, connection = null) => {
  return await crearNotificacion({
    id_usuario_receptor: id_empresa_usuario,
    tipo_notificacion: "proyecto_finalizado",
    mensaje: `'${nombre_freelancer}' ha marcado el proyecto '${nombre_proyecto}' como finalizado.`,
    enlace: `/proyectos/${id_proyecto}`
  }, connection);
};

/**
 * Notificar a la empresa que el freelancer aceptó la solicitud de chat
 */
const notificarSolicitudChatAceptada = async (id_empresa_usuario, nombre_freelancer, id_conversacion, connection = null) => {
  return await crearNotificacion({
    id_usuario_receptor: id_empresa_usuario,
    tipo_notificacion: "solicitud_chat_aceptada",
    mensaje: `'${nombre_freelancer}' aceptó tu solicitud de chat. Ya pueden conversar.`,
    enlace: `/chat/${id_conversacion}`
  }, connection);
};

/**
 * Notificar a la empresa que el freelancer rechazó la solicitud de chat
 */
const notificarSolicitudChatRechazada = async (id_empresa_usuario, nombre_freelancer, connection = null) => {
  return await crearNotificacion({
    id_usuario_receptor: id_empresa_usuario,
    tipo_notificacion: "solicitud_chat_rechazada",
    mensaje: `'${nombre_freelancer}' rechazó tu solicitud de chat.`,
    enlace: null
  }, connection);
};

/**
 * Notificar a la empresa que el freelancer aceptó la solicitud de entrevista
 */
const notificarSolicitudEntrevistaAceptada = async (id_empresa_usuario, nombre_freelancer, id_entrevista, connection = null) => {
  return await crearNotificacion({
    id_usuario_receptor: id_empresa_usuario,
    tipo_notificacion: "solicitud_entrevista_aceptada",
    mensaje: `'${nombre_freelancer}' aceptó tu invitación a la entrevista.`,
    enlace: `/empresa/proyectos/${id_proyecto}` 
  }, connection);
};

/**
 * Notificar a la empresa que el freelancer rechazó la solicitud de entrevista
 */
const notificarSolicitudEntrevistaRechazada = async (id_empresa_usuario, nombre_freelancer, connection = null) => {
  return await crearNotificacion({
    id_usuario_receptor: id_empresa_usuario,
    tipo_notificacion: "solicitud_entrevista_rechazada",
    mensaje: `'${nombre_freelancer}' rechazó tu invitación a la entrevista.`,
    enlace: null
  }, connection);
};

/**
 * Notificar a la empresa que el freelancer sugirió reprogramar la entrevista
 */
const notificarSolicitudEntrevistaReprogramar = async (id_empresa_usuario, nombre_freelancer, nueva_fecha, id_solicitud, connection = null) => {
  return await crearNotificacion({
    id_usuario_receptor: id_empresa_usuario,
    tipo_notificacion: "solicitud_entrevista_reprogramar",
    mensaje: `'${nombre_freelancer}' ha sugerido una nueva fecha para la entrevista.`,
    enlace: `/solicitudes/${id_solicitud}`
  }, connection);
};

// ==================== NOTIFICACIONES GENERALES ====================

/**
 * Notificar suscripción exitosa
 */
const notificarSuscripcionExitosa = async (id_usuario, nombre_plan, connection = null) => {
  return await crearNotificacion({
    id_usuario_receptor: id_usuario,
    tipo_notificacion: "suscripcion_exitosa",
    mensaje: `Tu suscripción al Plan ${nombre_plan} se ha activado exitosamente.`,
    enlace: `/freelancer-profile/subscription`
  }, connection);
};

/**
 * Notificar que la suscripción está por expirar
 */
const notificarSuscripcionPorExpirar = async (id_usuario, nombre_plan, dias_restantes, connection = null) => {
  return await crearNotificacion({
    id_usuario_receptor: id_usuario,
    tipo_notificacion: "suscripcion_por_expirar",
    mensaje: `Tu Plan ${nombre_plan} expira en ${dias_restantes} días. ¡Renuévalo para no perder beneficios!`,
    enlace: `/freelancer-profile/subscription`
  }, connection);
};

/**
 * Notificar que la suscripción ha expirado
 */
const notificarSuscripcionExpirada = async (id_usuario, nombre_plan, connection = null) => {
  return await crearNotificacion({
    id_usuario_receptor: id_usuario,
    tipo_notificacion: "suscripcion_expirada",
    mensaje: `Tu Plan ${nombre_plan} ha expirado.`,
    enlace: `/freelancer-profile/subscription`
  }, connection);
};

/**
 * Notificar que el soporte técnico respondió un ticket
 */
const notificarTicketSoporteRespondido = async (id_usuario, numero_ticket, connection = null) => {
  return await crearNotificacion({
    id_usuario_receptor: id_usuario,
    tipo_notificacion: "ticket_soporte_respondido",
    mensaje: `El equipo de soporte ha respondido a tu ticket #${numero_ticket}.`,
    enlace: `/soporte/ticket/${numero_ticket}`
  }, connection);
};

module.exports = {
  // Función genérica
  crearNotificacion,
  
  // Notificaciones para Freelancer
  notificarPostulacionRecibida,
  notificarPostulacionAceptada,
  notificarPostulacionRechazada,
  notificarSolicitudChatRecibida,
  notificarSolicitudEntrevistaRecibida,
  notificarPagoLiberado,
  notificarNuevoMensaje,
  notificarNuevaResenaRecibida,
  
  // Notificaciones para Empresa
  notificarNuevaPostulacion,
  notificarProyectoCreadoExitoso,
  notificarProyectoPagoExitoso,
  notificarProyectoFinalizado,
  notificarSolicitudChatAceptada,
  notificarSolicitudChatRechazada,
  notificarSolicitudEntrevistaAceptada,
  notificarSolicitudEntrevistaRechazada,
  notificarSolicitudEntrevistaReprogramar,
  
  // Notificaciones Generales
  notificarSuscripcionExitosa,
  notificarSuscripcionPorExpirar,
  notificarSuscripcionExpirada,
  notificarTicketSoporteRespondido,
};