const pool = require("../../db");

// Crear una nueva disputa
const createDispute = async (req, res) => {
  const { id_proyecto } = req.params;
  const { motivo, id_freelancer_usuario } = req.body; // ID usuario del freelancer
  const id_usuario_reportante = req.user.id_usuario;

  try {
    // Insertar disputa
    await pool.query(
      `INSERT INTO disputa (id_proyecto, id_usuario_reportante, id_usuario_reportado, motivo) 
       VALUES (?, ?, ?, ?)`,
      [id_proyecto, id_usuario_reportante, id_freelancer_usuario, motivo]
    );

    // Actualizar estado del proyecto a "en disputa" (opcional, visual)
    // Opcional: Podrías añadir un estado 'disputa' al ENUM de publicacion_proyecto si quisieras
    
    res.status(201).json({ message: "Disputa creada exitosamente. Un administrador revisará el caso." });
  } catch (error) {
    console.error("Error al crear disputa:", error);
    res.status(500).json({ error: "Error al registrar la disputa" });
  }
};

module.exports = { createDispute };