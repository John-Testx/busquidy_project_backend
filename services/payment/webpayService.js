const {WebpayPlus, Options, IntegrationApiKeys, Environment} = require("transbank-sdk");
const { saveWebpayTransaction } = require("../../queries/payment/transactionQueries");

class WebpayService {
  constructor() {
    this.commerceCode = process.env.WEBPAY_COMMERCE_CODE || "597055555532";
    this.apiKey = process.env.WEBPAY_API_KEY || IntegrationApiKeys.WEBPAY;
    this.environment = process.env.NODE_ENV === "production" ?
            Environment.Production :
            Environment.Integration;
    this.transactionLocks = new Map();
    this.lockTimeout = 15000; // 15 seconds
    this.lockCleanupInterval = 60000; // 1 minute

    // Start cleanup interval
    this.startLockCleanup();
  }

  startLockCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [token, timestamp] of this.transactionLocks) {
        if (now - timestamp >= this.lockTimeout) {
          this.transactionLocks.delete(token);
        }
      }
    }, this.lockCleanupInterval);
  }

  validateTransactionData({amount, buyOrder, sessionId, returnUrl, plan}) {
    if (!amount || amount <= 0) throw new Error("Monto inválido");
    if (!buyOrder) throw new Error("Orden de compra inválida");
    if (!sessionId) throw new Error("ID de sesión inválido");
    if (!returnUrl) throw new Error("URL de retorno inválida");

    // Para transacciones de proyecto, no requiere validación de plan
    if (buyOrder.startsWith("SUB-")) {
      if (!plan || !["mensual", "anual"].includes(plan)) {
        throw new Error("Plan de suscripción inválido");
      }
    }
  }

  async createTransaction(transactionData) {
    try {
      if (transactionData.buyOrder.startsWith("SUB-")) {
        if (!["mensual", "anual"].includes(transactionData.plan)) {
          throw new Error("Plan de suscripción inválido");
        }
      }

      this.validateTransactionData(transactionData);

      const { amount, buyOrder, sessionId, plan, tipoUsuario, metodoPago, returnUrl } = transactionData;

      const webpay = new WebpayPlus.Transaction(
        new Options(this.commerceCode, this.apiKey, this.environment)
      );

      const response = await webpay.create(buyOrder, sessionId, amount, returnUrl);
      if (!response?.token || !response?.url) {
        throw new Error("Respuesta inválida de Webpay");
      }

      // ✅ Guardar en base de datos
      await saveWebpayTransaction({
        token: response.token,
        buyOrder,
        sessionId,
        amount,
        planId: transactionData.planIdToUse,
        tipoUsuario,
        metodoPago,
        paymentType: 'SUBSCRIPTION',
      });

      console.log('✅ Transacción de suscripción guardada:', {
        token: response.token,
        planId: transactionData.planIdToUse,
        buyOrder
      });

      return {
        ...response,
      };
    } catch (error) {
      console.error("[WebpayService] Error creating transaction:", error);
      throw new Error(`Error al crear la transacción: ${error.message}`);
    }
  }

  async createProjectTransaction(projectTransactionData) {
    try {
      this.validateTransactionData(projectTransactionData);
      const { amount, buyOrder, sessionId, returnUrl, projectId, companyId } = projectTransactionData;

      // ⚠️ VALIDACIÓN CRÍTICA
      if (!projectId) {
        throw new Error("projectId es requerido para transacciones de proyecto");
      }

      const webpay = new WebpayPlus.Transaction(
        new Options(this.commerceCode, this.apiKey, this.environment)
      );

      const response = await webpay.create(buyOrder, sessionId, amount, returnUrl);
      if (!response?.token || !response?.url) {
        throw new Error("Respuesta inválida de Webpay");
      }

      // ✅ Guardar en base de datos
      await saveWebpayTransaction({
        token: response.token,
        buyOrder,
        sessionId,
        amount,
        projectId,
        companyId,
        metodoPago: 'Webpay',
        paymentType: 'PROJECT_PUBLICATION',
      });

      console.log('✅ Transacción de proyecto guardada:', {
        token: response.token,
        projectId,
        companyId,
        buyOrder
      });

      return {
        ...response,
      };
    } catch (error) {
      console.error("[WebpayService] Error creating project transaction:", error);
      throw new Error(`Error al crear la transacción de proyecto: ${error.message}`);
    }
  }

  async commitTransaction(token) {
    if (!token) throw new Error("Token no proporcionado");

    const now = Date.now();
    const lockInfo = this.transactionLocks.get(token);
    if (lockInfo && now - lockInfo < this.lockTimeout) {
      throw new Error("Transacción en proceso");
    }

    try {
      this.transactionLocks.set(token, now);

      const webpay = new WebpayPlus.Transaction(
        new Options(this.commerceCode, this.apiKey, this.environment)
      );

      const response = await webpay.commit(token);
      if (!response?.status) {
        throw new Error("Respuesta inválida de Webpay");
      }

      return response;
    } catch (error) {
      console.error("[WebpayService] Error committing transaction:", error);
      throw error;
    } finally {
      setTimeout(() => this.transactionLocks.delete(token), 1000);
    }
  }
}

// Singleton instance
module.exports = new WebpayService();