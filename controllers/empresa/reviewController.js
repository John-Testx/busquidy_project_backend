const { getFreelancerByUserId } = require("../../queries/freelancer/profileQueries");
const sendError = (res, status, message) => res.status(status).json({message});

// REVIEW NO ES SOLO DE EMPRESA, MOVERLO MAS ADELANTE.

/**
 * Controlador de reseñas de empresa
 * (Mantener el que ya tienes o crear uno nuevo si es necesario)
 */


async function addReview(req, res) {
  const { id_usuario, calificacion, comentario, id_identificador } = req.body;

  if (!id_usuario || !calificacion || !id_identificador) {
    return sendError(res, 400, "Faltan campos requeridos.");
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [usuarioResena] = await connection.query(
      "SELECT tipo_usuario FROM usuario WHERE id_usuario = ?",
      [id_usuario]
    );

    if (!usuarioResena || usuarioResena.length === 0) {
      return sendError(res, 404, "El usuario que reseña no existe.");
    }

    const tipoUsuario = usuarioResena[0].tipo_usuario;
    let tipo_calificado, id_calificado;

    if (tipoUsuario === "freelancer") {
      const [proyecto] = await connection.query(
        `SELECT p.id_empresa FROM proyecto p
         INNER JOIN publicacion_proyecto pp ON p.id_proyecto = pp.id_proyecto
         WHERE pp.id_publicacion = ?`,
        [id_identificador]
      );

      if (!proyecto || proyecto.length === 0) {
        return sendError(res, 404, "No se encontró una empresa asociada a la publicación.");
      }

      id_calificado = proyecto[0].id_empresa;

      const [empresaResults] = await connection.query(
        `SELECT id_usuario FROM empresa WHERE id_empresa = ?`, [id_calificado]
      );

      if (!empresaResults || empresaResults.length === 0) {
        return sendError(res, 404, "No se encontró la empresa.");
      }

      const idUsuarioCalificado = empresaResults[0].id_usuario;
      const usuarioResults = await getUserById(idUsuarioCalificado);

      if (!usuarioResults || usuarioResults.length === 0) {
        return sendError(res, 404, "No se encontró el usuario.");
      }

      tipo_calificado = usuarioResults[0].tipo_usuario;

    } else if (tipoUsuario === "empresa") {
      const [freelancer] = await connection.query(
        "SELECT id_freelancer FROM freelancer WHERE id_freelancer = ?",
        [id_identificador]
      );

      if (!freelancer || freelancer.length === 0) {
        return sendError(res, 404, "No puedes reseñar a un usuario del mismo tipo.");
      }

      const usuarioResults = await getFreelancerByUserId(id_identificador);

      if (!usuarioResults || usuarioResults.length === 0) {
        return sendError(res, 404, "No puedes reseñar a un usuario del mismo tipo.");
      }

      tipo_calificado = usuarioResults[0].tipo_usuario;

    } else {
      return sendError(res, 400, "El tipo de usuario que reseña no es válido.");
    }

    if (tipoUsuario === tipo_calificado) {
      return sendError(res, 400, "No puedes reseñar a un usuario del mismo tipo.");
    }

    const [existingReview] = await connection.query(
      "SELECT id_resena FROM resena WHERE id_usuario = ? AND id_calificado = ?",
      [id_usuario, id_calificado]
    );

    if (existingReview && existingReview.length > 0) {
      return sendError(res, 409, "Ya has realizado una reseña a este usuario.");
    }

    await connection.query(
      `INSERT INTO resena (id_usuario, tipo_calificado, id_calificado, calificacion, comentario, fecha_resena)
       VALUES (?, ?, ?, ?, ?, CURDATE())`,
      [id_usuario, tipo_calificado, id_calificado, calificacion, comentario]
    );

    await connection.commit();
    // ✅ AGREGAR NOTIFICACIÓN DE RESEÑA
    const { notificarNuevaResenaRecibida } = require("../../services/notificationService");
    const { getUserById } = require("../../queries/user/userQueries");

    // Obtener el id_usuario del calificado
    const usuarioCalificado = await getUserById(id_calificado);
    if (usuarioCalificado && usuarioCalificado.length > 0) {
      const nombreQuienResena = req.user.nombre || req.user.correo || "Un usuario";
      await notificarNuevaResenaRecibida(
        usuarioCalificado[0].id_usuario,
        nombreQuienResena,
        calificacion,
        null, // o el ID de la reseña si lo quieres incluir
        connection
      );
    }

    res.status(201).json({ message: "Reseña agregada exitosamente." });

  } catch (err) {
    console.error("Error inesperado:", err);
    return sendError(res, 500, "Ocurrió un error inesperado.");
  } finally {
    if (connection) connection.release();
  }
}

module.exports = {
  addReview
};