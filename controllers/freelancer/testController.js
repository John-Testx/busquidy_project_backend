const testQueries = require('../../queries/freelancer/testQueries');
const profileQueries = require('../../queries/freelancer/profileQueries'); // Para obtener id_freelancer desde id_usuario

// Obtener preguntas para el frontend
const getQuestions = async (req, res) => {
  try {
    const questions = await testQueries.getPublicQuestions();
    res.json(questions);
  } catch (error) {
    console.error("Error obteniendo preguntas:", error);
    res.status(500).json({ message: "Error interno al cargar el test" });
  }
};

// Verificar estado
const getStatus = async (req, res) => {
  try {
    const { id_usuario } = req.params;
    
    // Obtener ID Freelancer
    const freelancerProfile = await profileQueries.buscarFreelancerByUserId(id_usuario);
    if (!freelancerProfile) {
      return res.status(404).json({ message: "Perfil de freelancer no encontrado" });
    }

    const result = await testQueries.checkTestStatus(freelancerProfile.id_freelancer);
    
    res.json({ 
      hasTakenTest: !!result, 
      result: result || null 
    });
  } catch (error) {
    console.error("Error verificando estado:", error);
    res.status(500).json({ message: "Error interno" });
  }
};

// Procesar y guardar el test
const submitTest = async (req, res) => {
  try {
    const { id_usuario, answers } = req.body; // answers es { "1": 5, "2": 4 ... }

    // 1. Obtener ID Freelancer
    const freelancerProfile = await profileQueries.buscarFreelancerByUserId(id_usuario);
    if (!freelancerProfile) {
      return res.status(404).json({ message: "Perfil de freelancer no encontrado" });
    }
    const id_freelancer = freelancerProfile.id_freelancer;

    // 2. Verificar si ya lo hizo (Doble check de seguridad)
    const existing = await testQueries.checkTestStatus(id_freelancer);
    if (existing) {
      return res.status(400).json({ message: "Ya has realizado esta prueba anteriormente." });
    }

    // 3. Calcular Puntaje
    let totalScore = 0;
    const values = Object.values(answers);
    
    // Sumar valores (asumiendo que vienen enteros 1-5)
    values.forEach(val => {
      totalScore += parseInt(val) || 0;
    });

    // 4. Determinar Nivel
    // Rangos basados en 36 preguntas (Min 36, Max 180)
    // Bajo: 36 - 83
    // Medio: 84 - 131
    // Alto: 132 - 180
    let nivel = 'Bajo';
    if (totalScore >= 132) {
      nivel = 'Alto';
    } else if (totalScore >= 84) {
      nivel = 'Medio';
    }

    // 5. Guardar en BD
    await testQueries.saveTestResult(id_freelancer, totalScore, nivel);

    res.json({ 
      success: true, 
      message: "Test guardado exitosamente", 
      nivel: nivel 
    });

  } catch (error) {
    console.error("Error guardando test:", error);
    res.status(500).json({ message: "Error interno al guardar resultados" });
  }
};

module.exports = {
  getQuestions,
  getStatus,
  submitTest
};