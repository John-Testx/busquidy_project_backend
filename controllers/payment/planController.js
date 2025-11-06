const { getPlanes } = require("../../queries/payment/planQueries");

/**
 * Obtener lista de planes
 */
const getAllPlanes = async (req, res) => {
  try {
    const { tipo_usuario } = req.query;

    const rows = await getPlanes(tipo_usuario);

    // Parse JSON beneficios si está como string
    const formattedPlans = rows.map(plan => ({
      ...plan,
      beneficios: (() => {
        try {
          // Si ya es un objeto/array, devolverlo tal cual
          if (typeof plan.beneficios === 'object') {
            return plan.beneficios;
          }
          // Si es string, parsearlo
          return JSON.parse(plan.beneficios);
        } catch {
          // Fallback: intentar split por comas
          return plan.beneficios ? plan.beneficios.split(",").map(b => b.trim()) : [];
        }
      })()
    }));

    res.status(200).json(formattedPlans);
  } catch (error) {
    console.error("❌ Error fetching plans:", error);
    res.status(500).json({ error: "Error al obtener los planes" });
  }
};

module.exports = {
  getAllPlanes,
};