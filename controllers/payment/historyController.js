const { getPagosProyectos, getPagosSuscripciones } = require("../../queries/payment/transactionQueries");

/**
 * Obtener historial de pagos de proyectos
 */
const getProjectPaymentHistory = async (req, res) => {
  try {
    const pagosProyectos = await getPagosProyectos();

    if (pagosProyectos.length === 0) {
      return res.status(404).json({ error: "No se encontraron pagos de proyectos" });
    }

    res.json(pagosProyectos);
  } catch (error) {
    console.error("Error al obtener pagos de proyectos:", error);
    res.status(500).json({
      error: "Error interno del servidor",
      mensaje: error.message,
    });
  }
};

/**
 * Obtener historial de pagos de suscripciones
 */
const getSubscriptionPaymentHistory = async (req, res) => {
  try {
    const pagosSuscripciones = await getPagosSuscripciones();

    if (pagosSuscripciones.length === 0) {
      return res.status(404).json({ error: "No se encontraron pagos de suscripciones" });
    }

    res.json(pagosSuscripciones);
  } catch (error) {
    console.error("Error al obtener pagos de suscripciones:", error);
    res.status(500).json({
      error: "Error interno del servidor",
      mensaje: error.message,
    });
  }
};

module.exports = {
  getProjectPaymentHistory,
  getSubscriptionPaymentHistory,
};