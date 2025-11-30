const pool = require("../../db");

// Get all questions ordered by their 'orden' field
const getAllQuestions = async (req, res) => {
  try {
    const [questions] = await pool.query("SELECT * FROM prueba_psicologica ORDER BY orden ASC");
    res.json(questions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create a new question
const createQuestion = async (req, res) => {
  const { enunciado, modulo, dimension, orden } = req.body;
  try {
    const [result] = await pool.query(
      "INSERT INTO prueba_psicologica (enunciado, modulo, dimension, tipo_respuesta, orden, is_publicada) VALUES (?, ?, ?, 'likert_5', ?, TRUE)",
      [enunciado, modulo, dimension, orden || 99]
    );
    res.json({ id_pregunta: result.insertId, message: "Pregunta creada" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a question
const updateQuestion = async (req, res) => {
  const { id } = req.params;
  const { enunciado, modulo, dimension, orden, is_publicada } = req.body;
  try {
    await pool.query(
      "UPDATE prueba_psicologica SET enunciado=?, modulo=?, dimension=?, orden=?, is_publicada=? WHERE id_pregunta=?",
      [enunciado, modulo, dimension, orden, is_publicada, id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a question
const deleteQuestion = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM prueba_psicologica WHERE id_pregunta=?", [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion
};