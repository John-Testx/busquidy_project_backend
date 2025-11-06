const axios = require('axios');
const searchQueries = require('../../queries/freelancer/searchQueries');

// Define the URL for your Python AI service
// Make sure this is accessible from your Node.js backend
require('dotenv').config();

const RECOMMENDATION_API_URL = process.env.RECOMMENDATION_API_URL + '/recommend/';

/**
 * Obtener recomendaciones de freelancers basadas en un proyecto
 */
const getFreelancerRecommendations = async (req, res) => {
    const { categoria, habilidades_requeridas } = req.body;
    console.log("Solicitud de recomendaciones recibida:", { categoria, habilidades_requeridas });    

    if (!categoria || !habilidades_requeridas) {
        return res.status(400).json({ error: 'La categoría y las habilidades son requeridas.' });
    }

  try {
    // 1. Llamar a la API de Python para obtener los IDs
    const apiRequestData = {
      categoria_proyecto: categoria,
      habilidades_requeridas: habilidades_requeridas, // Enviar como un array, axios lo serializa a JSON
    };

    let recommended_ids = [];

    try {
      const apiResponse = await axios.post(RECOMMENDATION_API_URL, apiRequestData);
      recommended_ids = apiResponse.data.recommended_ids;
    } catch (aiError) {
      console.error('Error al contactar la API de IA:', aiError.message);
      // No fallar, solo devolver un array vacío
      return res.status(200).json([]);
    }
    
    if (!recommended_ids || recommended_ids.length === 0) {
      console.log('IA no devolvió recomendaciones.');
      return res.status(200).json([]);
    }

    // 2. Obtener los perfiles completos desde la base de datos
    // (Crearemos esta función en el Step 4)
    const freelancers = await searchQueries.findFreelancersByIds(recommended_ids);

    // 3. Re-ordenar los resultados de la BD para que coincidan con el ranking de la IA
    // La consulta SQL "IN" no garantiza el orden, así que lo forzamos aquí.
    const orderedFreelancers = recommended_ids.map(id => {
      return freelancers.find(f => f.id_freelancer === id);
    }).filter(Boolean); // .filter(Boolean) elimina cualquier ID que no se haya encontrado en la BD

    res.status(200).json(orderedFreelancers);

  } catch (error) {
    console.error('Error al obtener perfiles de freelancers:', error);
    res.status(500).json({ error: 'Error interno del servidor al procesar recomendaciones.' });
  }
};

module.exports = {
  getFreelancerRecommendations,
};