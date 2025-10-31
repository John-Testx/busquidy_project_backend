const { getUsageDetails } = require('../../services/subscriptionService');

/**
 * Controlador para obtener el uso y límites del plan del usuario.
 */
const getUsage = async (req, res) => {
    try {
        const { id } = req.user; // ID del usuario autenticado
        
        const usageDetails = await getUsageDetails(id);
        
        res.json(usageDetails);

    } catch (error) {
        console.error("Error en getUsage controller:", error);
        res.status(500).json({ error: "Error al obtener los detalles de uso.", details: error.message });
    }
};

module.exports = {
    getUsage
};
