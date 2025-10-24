const express = require("express");
const router = express.Router();


router.get("/freelancers", obtenerRecomendaciones);

async function obtenerRecomendaciones(proyecto) {
  try {
    // La URL de tu microservicio de Python
    const recommendationApiUrl = 'http://127.0.0.1:8000/recommend/';

    const datosParaApi = {
      categoria_proyecto: proyecto.categoria,
      // Asegúrate de que las habilidades se envíen como un string JSON
      habilidades_requeridas: JSON.stringify(proyecto.habilidades_requeridas)
    };

    const response = await axios.post(recommendationApiUrl, datosParaApi);

    // La respuesta contendrá { recommended_ids: [123, 45, 67] }
    const idsRecomendados = response.data.recommended_ids;

    console.log('Freelancers recomendados:', idsRecomendados);

    // Aquí puedes guardar estos IDs o hacer lo que necesites con ellos
    return idsRecomendados;

  } catch (error) {
    console.error('Error al obtener recomendaciones:', error.message);
    // Devolver un array vacío o manejar el error como prefieras
    return [];
  }
}

module.exports = router;