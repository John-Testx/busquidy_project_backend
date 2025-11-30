const pool = require("../../db");

// Subir un nuevo entregable
const addDeliverable = async (req, res) => {
  const { id_proyecto } = req.params;
  const { descripcion, archivo_url, nombre_archivo } = req.body;
  const id_usuario = req.user.id_usuario;

  try {
    // 1. Obtener ID del freelancer
    const [freelancerRows] = await pool.query(
      "SELECT id_freelancer FROM freelancer WHERE id_usuario = ?", 
      [id_usuario]
    );

    if (freelancerRows.length === 0) {
      return res.status(403).json({ error: "No eres un freelancer." });
    }
    const id_freelancer = freelancerRows[0].id_freelancer;

    // 2. Insertar entregable
    await pool.query(
      `INSERT INTO entregable (id_proyecto, id_freelancer, descripcion, archivo_url, nombre_archivo, fecha_entrega) 
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [id_proyecto, id_freelancer, descripcion, archivo_url, nombre_archivo]
    );

    // 3. Notificar al cliente (Opcional, se puede agregar después)
    
    res.status(201).json({ message: "Entregable enviado exitosamente." });

  } catch (error) {
    console.error("Error al subir entregable:", error);
    res.status(500).json({ error: "Error interno al guardar el entregable." });
  }
};

// Obtener entregables de un proyecto
const getDeliverables = async (req, res) => {
  const { id_proyecto } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT e.*, f.id_usuario 
       FROM entregable e
       JOIN freelancer f ON e.id_freelancer = f.id_freelancer
       WHERE e.id_proyecto = ?
       ORDER BY e.fecha_entrega DESC`,
      [id_proyecto]
    );

    res.json(rows);
  } catch (error) {
    console.error("Error al obtener entregables:", error);
    res.status(500).json({ error: "Error al cargar entregables." });
  }
};

module.exports = { addDeliverable, getDeliverables };