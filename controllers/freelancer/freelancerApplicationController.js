const pool = require("../../db");
const applicationQueries = require("../../queries/freelancer/applicationQueries");

/**
 * Crear postulación a un proyecto
 */
const createApplication = async (req, res) => {
  const { id_publicacion } = req.params;
  const { id_usuario } = req.body;

  console.log("id_publicacion:", id_publicacion);
  console.log("id_usuario:", id_usuario);

  if (!id_publicacion || isNaN(id_publicacion) || !id_usuario || isNaN(id_usuario)) {
    return res.status(400).json({ error: "ID invalido" });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Verificar si el freelancer ya aplicó a este proyecto
    const alreadyApplied = await applicationQueries.checkExistingApplication(
      id_publicacion, 
      id_usuario, 
      connection
    );

    if (alreadyApplied) {
      await connection.rollback();
      return res.status(400).json({ error: "Ya has aplicado a este proyecto" });
    }

    // Obtener id_freelancer
    const id_freelancer = await applicationQueries.getFreelancerIdByUserId(
      id_usuario, 
      connection
    );

    if (!id_freelancer) {
      await connection.rollback();
      return res.status(404).json({ error: "No se encontró el freelancer" });
    }

    // Crear postulación
    await applicationQueries.createApplication(
      id_publicacion, 
      id_freelancer, 
      connection
    );

    await connection.commit();
    res.status(201).json({
      message: "Postulación exitosa",
      id_publicacion: id_publicacion
    });
  } catch (error) {
    console.error("Error al intentar postular:", error);
    if (connection) await connection.rollback();
    res.status(500).json({ error: "Error interno del servidor" });
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Obtener postulaciones del freelancer
 */
const getApplications = async (req, res) => {
  const { id_usuario } = req.params;

  if (!id_usuario || isNaN(id_usuario)) {
    return res.status(400).json({ error: "ID inválido" });
  }

  try {
    // Obtener id_freelancer
    const id_freelancer = await applicationQueries.getFreelancerIdByUserId(id_usuario);

    if (!id_freelancer) {
      return res.status(404).json({ error: "No se encontró el freelancer" });
    }

    // Obtener postulaciones
    const postulaciones = await applicationQueries.getFreelancerApplications(id_freelancer);

    res.json(postulaciones);
  } catch (error) {
    console.error("Error al obtener las postulaciones:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

/**
 * Eliminar postulación
 */
const deleteApplication = async (req, res) => {
  const { id_postulacion } = req.params;

  if (!id_postulacion || isNaN(id_postulacion)) {
    return res.status(400).json({ error: "ID inválido" });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    // Verificar si la postulación existe
    const exists = await applicationQueries.checkApplicationExists(
      id_postulacion, 
      connection
    );

    if (!exists) {
      return res.status(404).json({
        success: false,
        message: "Postulación no encontrada"
      });
    }

    // Eliminar postulación
    await applicationQueries.deleteApplication(id_postulacion, connection);

    res.status(200).json({
      success: true,
      message: "Postulación eliminada correctamente"
    });
  } catch (error) {
    console.error("Error al eliminar la postulación:", error);
    res.status(500).json({
      success: false,
      message: "Error al eliminar la postulación"
    });
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  createApplication,
  getApplications,
  deleteApplication
};