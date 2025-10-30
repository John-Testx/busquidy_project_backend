const pool = require("../../db");
const webpayService = require("../../services/payment/webpayService");
const { processProjectPayment } = require("../../services/payment/projectPaymentService");
const { processSubscriptionPayment } = require("../../services/payment/subscriptionPaymentService");
const { getPlanById } = require("../../queries/payment/planQueries");
const { 
  getWebpayTransactionByToken, 
  updateWebpayTransactionStatus,
} = require("../../queries/payment/transactionQueries");

/**
 * Crear transacción de suscripción
 */
const createSubscriptionTransaction = async (req, res) => {
  let connection;
  try {
    const { amount, buyOrder, sessionId, plan, tipoUsuario, metodoPago, returnUrl: requestReturnUrl } = req.body;

    console.log("Received request body:", req.body);

    if (!amount || !buyOrder || !sessionId || !plan || !tipoUsuario || !metodoPago) {
      return res.status(400).json({ error: "Datos incompletos o inválidos" });
    }

    const returnUrl = requestReturnUrl || `${process.env.FRONTEND_URL || "http://localhost:3000"}/freelancer`;

    connection = await pool.getConnection();

    // Fetch plan from DB
    const planRow = await getPlanById(plan);

    if (!planRow) {
      return res.status(400).json({ error: "Plan de suscripción inválido" });
    }

    // Map nombre/duration to WebpayService compatible string
    let planNombre;
    const nombreLower = planRow.nombre.toLowerCase();
    if (nombreLower.includes("mensual") || planRow.duracion_dias === 30) {
      planNombre = "mensual";
    } else if (nombreLower.includes("anual") || planRow.duracion_dias === 365) {
      planNombre = "anual";
    } else {
      return res.status(400).json({ error: "Plan de suscripción inválido" });
    }

    console.log("Plan received (raw ID):", plan);
    console.log("Plan mapped for WebpayService:", planNombre);

    const response = await webpayService.createTransaction({
      amount,
      buyOrder,
      sessionId,
      plan: planNombre,
      tipoUsuario,
      metodoPago,
      returnUrl,
      planIdToUse: plan,
    });

    console.log("[WebpayService] Transaction response:", response);
    res.json(response);
  } catch (error) {
    console.error("Error en create_transaction_suscription:", error);
    res.status(500).json({ error: "Error al crear la transacción: " + error.message });
  } finally {
    if (connection) {
      try { 
        connection.release(); 
      } catch (e) { 
        console.warn("Failed to release connection:", e); 
      }
    }
  }
};

/**
 * Crear transacción de proyecto
 */
const createProjectTransaction = async (req, res) => {
  try {
    // Extrae los datos directamente del cuerpo de la solicitud.
    const { amount, buyOrder, sessionId, returnUrl: requestReturnUrl, projectId, companyId } = req.body;

    console.log('=== CREAR TRANSACCIÓN DE PROYECTO ===');
    console.log('Request body:', { amount, buyOrder, sessionId, projectId, companyId });

    if (!amount || !buyOrder || !sessionId) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    // ⚠️ VALIDACIÓN CRÍTICA
    if (!projectId) {
      console.error('❌ projectId es undefined o null');
      return res.status(400).json({ 
        error: "projectId es requerido",
        code: "MISSING_PROJECT_ID" 
      });
    }

    const returnUrl = requestReturnUrl || `${process.env.FRONTEND_URL || "http://localhost:3000"}/myprojects`;

    const response = await webpayService.createProjectTransaction({
      amount,
      buyOrder,
      sessionId,
      returnUrl,
      projectId,
      companyId,
    });

    console.log('✅ Transacción creada exitosamente');
    res.json(response);
  } catch (error) {
    console.error("Error en create_transaction_project:", error);
    res.status(500).json({ error: "Error al crear la transacción: " + error.message });
  }
};

/**
 * Confirmar transacción (commit)
 */
const commitTransaction = async (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({
      status: "ERROR",
      error: "Token no proporcionado",
      code: "INVALID_TOKEN",
    });
  }

  let connection;
  let responseSent = false;

  try {
    console.log('=== CONFIRMAR TRANSACCIÓN ===');
    console.log('Token:', token);

    // 1. ✅ Obtener transacción de la BD
    const savedTransaction = await getWebpayTransactionByToken(token);
    
    if (!savedTransaction) {
      console.error('❌ Transacción no encontrada en BD');
      return res.status(404).json({
        status: "ERROR",
        error: "Transacción no encontrada",
        code: "TRANSACTION_NOT_FOUND",
      });
    }

    console.log('Transacción encontrada:', savedTransaction);

    // 2. ✅ Verificar si ya fue procesada
    if (['APPROVED', 'REJECTED'].includes(savedTransaction.status)) {
      console.log('⚠️ Transacción ya procesada:', savedTransaction.status);
      
      if (savedTransaction.status === 'APPROVED') {
        return res.json({
          status: 'APPROVED',
          message: 'Transacción ya procesada anteriormente',
          type: savedTransaction.payment_type,
          projectId: savedTransaction.project_id,
          amount: savedTransaction.amount,
          buyOrder: savedTransaction.buy_order,
        });
      } else {
        return res.json({
          status: 'REJECTED',
          message: 'Pago rechazado',
          type: savedTransaction.payment_type,
        });
      }
    }

    // 3. ✅ Verificar si está en proceso
    if (savedTransaction.status === 'PROCESSING') {
      console.log('⏳ Transacción en proceso...');
      return res.status(409).json({
        status: "PENDING",
        message: "El pago se está confirmando, por favor espera unos segundos...",
        code: "TRANSACTION_IN_PROGRESS"
      });
    }

    // 4. ✅ Marcar como PROCESSING
    await updateWebpayTransactionStatus(token, 'PROCESSING');

    // 5. ✅ Confirmar con Webpay
    const response = await webpayService.commitTransaction(token);
    const status = response.status === "AUTHORIZED" ? "APPROVED" : "REJECTED";
    const buyOrder = response.buy_order;
    const sessionId = response.session_id;
    const monto = Number(response.amount) || 0;
    const metodoPago = savedTransaction.metodo_pago || "Webpay";
    const idUsuario = String(sessionId).includes("-") ? sessionId.split("-")[1] : sessionId;

    connection = await pool.getConnection();

    // Procesamiento de pago de proyecto
    if (savedTransaction.payment_type === 'PROJECT_PUBLICATION') {
      console.log("Processing project publication payment");
      
      // ✅ Obtener projectId de la BD (no del buyOrder)
      const idProyecto = savedTransaction.project_id;

      if (!idProyecto || isNaN(idProyecto)) {
        console.error('❌ ID de proyecto inválido:', idProyecto);
        await updateWebpayTransactionStatus(token, 'ERROR');
        throw new Error("ID de proyecto inválido");
      }

      console.log('✅ Procesando pago para proyecto ID:', idProyecto);

      const pagoId = await processProjectPayment(connection, {
        idUsuario,
        idProyecto,
        monto,
        metodoPago,
        token,
        status,
      });

      // ✅ Actualizar estado en BD
      await updateWebpayTransactionStatus(token, status, response.response_code);
      await connection.commit();
      // ✅ AGREGAR NOTIFICACIÓN DE PAGO EXITOSO
      if (status === 'APPROVED') {
        const { notificarProyectoPagoExitoso } = require("../../services/notificationService");
        
        // Obtener datos del proyecto
        const [proyectoData] = await connection.query(
          "SELECT p.nombre_proyecto, p.id_empresa FROM proyecto p WHERE p.id_proyecto = ?",
          [idProyecto]
        );
        
        if (proyectoData && proyectoData.length > 0) {
          const nombreProyecto = proyectoData[0].nombre_proyecto;
          
          // Obtener id_usuario de la empresa
          const [empresaData] = await connection.query(
            "SELECT id_usuario FROM empresa WHERE id_empresa = ?",
            [proyectoData[0].id_empresa]
          );
          
          if (empresaData && empresaData.length > 0) {
            await notificarProyectoPagoExitoso(
              empresaData[0].id_usuario,
              nombreProyecto,
              idProyecto,
              connection
            );
          }
        }
      }
      responseSent = true;

      console.log('✅ Pago de proyecto procesado exitosamente');

      return res.json({
        status,
        token,
        buyOrder,
        amount: monto,
        type: "PROJECT_PUBLICATION",
        projectId: idProyecto,
        pagoId,
        message: status === 'APPROVED' ? 'Proyecto publicado exitosamente' : 'Pago rechazado',
      });
    }

    // Procesamiento de pago de suscripción
    if (savedTransaction.payment_type === 'SUBSCRIPTION') {
      const planRaw = savedTransaction.plan_id;
      
      if (!planRaw) {
        await updateWebpayTransactionStatus(token, 'ERROR');
        throw { code: "INVALID_PLAN", message: "No se proporcionó plan válido" };
      }

      const subResult = await processSubscriptionPayment(connection, {
        idUsuario,
        monto,
        metodoPago,
        token,
        status,
        planRaw,
      });

      await updateWebpayTransactionStatus(token, status, response.response_code);
      await connection.commit();
      // ✅ AGREGAR NOTIFICACIÓN DE SUSCRIPCIÓN
      if (status === 'APPROVED') {
        const { notificarSuscripcionExitosa } = require("../../services/notificationService");
        const { getPlanById } = require("../../queries/payment/planQueries");
        
        const planData = await getPlanById(planRaw);
        if (planData) {
          await notificarSuscripcionExitosa(
            idUsuario,
            planData.nombre,
            connection
          );
        }
      }
      responseSent = true;

      return res.json({
        status,
        token,
        buyOrder,
        amount: monto,
        type: "SUBSCRIPTION",
        userId: idUsuario,
        planId: planRaw,
        ...subResult,
      });
    }

    // Tipo desconocido
    await updateWebpayTransactionStatus(token, 'ERROR');
    responseSent = true;
    return res.status(400).json({
      status: "ERROR",
      error: "Tipo de transacción desconocido",
      code: "UNKNOWN_TRANSACTION_TYPE",
    });

  } catch (error) {
    console.error("Error al confirmar transacción:", error);

    if (error.message === "Transacción en proceso") {
      return res.status(409).json({
        status: "PENDING",
        message: "El pago se está confirmando, por favor espera unos segundos...",
        code: "TRANSACTION_IN_PROGRESS"
      });
    }

    if (!responseSent && connection) {
      try {
        await connection.rollback();
      } catch (rollbackErr) {
        console.warn("Error during rollback:", rollbackErr);
      }
    }

    // Actualizar estado a ERROR en BD
    if (token) {
      try {
        await updateWebpayTransactionStatus(token, 'ERROR');
      } catch (updateErr) {
        console.warn("Error updating transaction status:", updateErr);
      }
    }

    if (!responseSent) {
      const statusCode = error?.code === "ACTIVE_SUBSCRIPTION_EXISTS" ? 409 : 500;
      const errorMsg =
        error?.code === "ACTIVE_SUBSCRIPTION_EXISTS"
          ? "Ya existe una suscripción activa"
          : "Error al procesar el pago";
      return res.status(statusCode).json({
        status: "ERROR",
        error: errorMsg,
        code: error?.code || "UNEXPECTED_ERROR",
        details: error?.message,
      });
    }
  } finally {
    if (connection) {
      try {
        await connection.release();
      } catch (releaseErr) {
        console.warn("Failed to release connection:", releaseErr);
      }
    }
  }
};

module.exports = {
  createSubscriptionTransaction,
  createProjectTransaction,
  commitTransaction,
};