const { getPlanes } = require("../../queries/payment/planQueries");

/**
 * Obtener lista de planes
 */
const getAllPlanes = async (req, res) => {
  try {
    const { tipo_usuario } = req.query;

    const rows = await getPlanes(tipo_usuario);

    // Parse JSON if 'beneficios' is stored as JSON string
    const formattedPlans = rows.map(plan => ({
      ...plan,
      beneficios: (() => {
        try {
          return JSON.parse(plan.beneficios);
        } catch {
          return plan.beneficios ? plan.beneficios.split(",") : [];
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