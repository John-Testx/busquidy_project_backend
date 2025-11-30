const pool = require('../../db');

// Obtener preguntas publicadas
const getPublicQuestions = async () => {
  const [rows] = await pool.query(
    "SELECT id_pregunta, enunciado, modulo, dimension FROM prueba_psicologica WHERE is_publicada = TRUE ORDER BY orden ASC"
  );
  return rows;
};

// Verificar si el freelancer ya hizo el test
const checkTestStatus = async (id_freelancer) => {
  const [rows] = await pool.query(
    "SELECT id_resultado, puntaje_total, nivel FROM resultado_prueba WHERE id_freelancer = ?",
    [id_freelancer]
  );
  return rows[0]; // Retorna undefined si no existe, o el objeto si existe
};

// Guardar el resultado
const saveTestResult = async (id_freelancer, puntaje_total, nivel) => {
  const [result] = await pool.query(
    "INSERT INTO resultado_prueba (id_freelancer, puntaje_total, nivel) VALUES (?, ?, ?)",
    [id_freelancer, puntaje_total, nivel]
  );
  return result.insertId;
};

module.exports = {
  getPublicQuestions,
  checkTestStatus,
  saveTestResult
};