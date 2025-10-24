const { insertPago, insertPagoDetalleSuscripcion } = require("../../queries/payment/transactionQueries");
const { hasActiveSuscripcion, insertSuscripcion } = require("../../queries/payment/subscriptionQueries");
const { getPlanById } = require("../../queries/payment/planQueries");
const {getUserById} = require("../../queries/user/userQueries");

/**
 * Procesar pago de suscripción
 * @param {Object} connection - Conexión de base de datos
 * @param {Object} data - Datos del pago
 * @returns {Promise<Object>} Resultado del procesamiento
 */
const processSubscriptionPayment = async (connection, { idUsuario, monto, metodoPago, token, status, planRaw }) => {
  await connection.beginTransaction();

  try {
    const estadoPago = status === "APPROVED" ? "completado" : "fallido";

    // Verificar suscripción activa solo si el pago fue aprobado
    if (status === "APPROVED") {
      const hasActive = await hasActiveSuscripcion(connection, idUsuario);
      if (hasActive) {
        throw {
          code: "ACTIVE_SUBSCRIPTION_EXISTS",
          message: "El usuario ya tiene una suscripción activa"
        };
      }
    }

    // Obtener información del plan
    const planRow = await getPlanById(planRaw);
    if (!planRow) {
      throw { code: "INVALID_PLAN", message: "Plan de suscripción no encontrado" };
    }

    const duracionDias = planRow.duracion_dias;

    // Calcular fechas de inicio y fin
    const fechaInicio = new Date();
    const fechaFin = new Date(fechaInicio);
    fechaFin.setDate(fechaFin.getDate() + duracionDias);

    const formatDate = (d) => d.toISOString().split("T")[0];
    const fechaInicioFormatted = formatDate(fechaInicio);
    const fechaFinFormatted = formatDate(fechaFin);

    // Insertar pago
    const pagoId = await insertPago(connection, {
      idUsuario,
      monto,
      estadoPago,
      metodoPago,
      referenciaExterna: token,
      tipoPago: "suscripcion"
    });

    // Crear suscripción
    const susEstado = status === "APPROVED" ? "activa" : "pendiente";
    const [susResult] = await connection.query(
      `INSERT INTO suscripcion (id_usuario, id_plan, fecha_inicio, fecha_fin, estado) 
       VALUES (?, ?, ?, ?, ?)`,
      [idUsuario, planRaw, fechaInicioFormatted, fechaFinFormatted, susEstado]
    );
    const suscripcionId = susResult.insertId;

    // Vincular pago con suscripción
    await insertPagoDetalleSuscripcion(connection, pagoId, suscripcionId);

    // Actualizar flag premium si el pago fue aprobado
    if (status === "APPROVED") {
      const userCheckResults = await getUserById(idUsuario);
      if (!userCheckResults.length) {
        throw { code: "USER_NOT_FOUND", message: "Usuario no encontrado" };
      }

      const tipo_usuario = userCheckResults[0].tipo_usuario;

      if (tipo_usuario === "freelancer") {
        await connection.query(
          `UPDATE freelancer SET premium = 1 WHERE id_usuario = ?`,
          [idUsuario]
        );
      } else if (tipo_usuario === "empresa") {
        await connection.query(
          `UPDATE empresa SET premium = 1 WHERE id_usuario = ?`,
          [idUsuario]
        );
      } else {
        throw { code: "INVALID_USER_TYPE", message: "Tipo de usuario inválido" };
      }
    }

    await connection.commit();

    return {
      pagoId,
      suscripcionId,
      fechaInicio: fechaInicioFormatted,
      fechaFin: fechaFinFormatted,
      planId: planRaw,
      duracionDias,
      planNombre: planRow.nombre
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  }
};

module.exports = {
  processSubscriptionPayment,
};