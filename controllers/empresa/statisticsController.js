const empresaQueries = require("../../queries/empresa/empresaQueries");
const statisticsQueries = require("../../queries/empresa/statisticsQueries");

/**
 * Controlador de estadísticas de empresa
 */

// Obtener estadísticas de la empresa
const getEmpresaStatistics = async (req, res) => {
  const { id_usuario } = req.params;

  try {
    // Obtener empresa
    const empresaResults = await empresaQueries.findEmpresaByUserId(id_usuario);
    if (empresaResults.length === 0) {
      return res.status(404).json({ error: "Empresa no encontrada" });
    }

    const id_empresa = empresaResults[0].id_empresa;

    // Obtener estadísticas
    const stats = await statisticsQueries.getEmpresaStats(id_empresa);

    res.json(stats);
  } catch (error) {
    console.error("Error al obtener estadísticas:", error);
    res.status(500).json({ error: "Error al obtener estadísticas" });
  }
};

module.exports = {
  getEmpresaStatistics
};