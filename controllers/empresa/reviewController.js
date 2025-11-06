const { getFreelancerByUserId } = require("../../queries/freelancer/profileQueries");
const { getUserById } = require("../../queries/user/userQueries"); // ✅ IMPORT MOVIDO AQUÍ
const pool = require("../../db"); // ✅ IMPORT FALTANTE DE 'pool'

const sendError = (res, status, message) => res.status(status).json({message});

// REVIEW NO ES SOLO DE EMPRESA, MOVERLO MAS ADELANTE.

/**
 * Controlador de reseñas (General)
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
      await connection.rollback();
      return sendError(res, 404, "El usuario que reseña no existe.");
    }

    const tipoUsuario = usuarioResena[0].tipo_usuario;
    
    // --- Variables Refactorizadas ---
    let id_calificado; // Almacenará el id_empresa o id_freelancer
    let id_usuario_calificado; // Almacenará el id_usuario del perfil calificado (para notif.)
    let tipo_calificado; // Almacenará el tipo_usuario del perfil calificado
    // ---------------------------------

    if (tipoUsuario === "freelancer") {
      // Un Freelancer está reseñando a una Empresa
      // id_identificador = id_publicacion
      const [proyecto] = await connection.query(
        `SELECT p.id_empresa FROM proyecto p
         INNER JOIN publicacion_proyecto pp ON p.id_proyecto = pp.id_proyecto
         WHERE pp.id_publicacion = ?`,
        [id_identificador]
      );

      if (!proyecto || proyecto.length === 0) {
        await connection.rollback();
        return sendError(res, 404, "No se encontró una empresa asociada a la publicación.");
      }

      id_calificado = proyecto[0].id_empresa; // Este es el id_empresa

      const [empresaResults] = await connection.query(
        `SELECT id_usuario FROM empresa WHERE id_empresa = ?`, [id_calificado]
      );

      if (!empresaResults || empresaResults.length === 0) {
        await connection.rollback();
        return sendError(res, 404, "No se encontró la empresa.");
      }

      id_usuario_calificado = empresaResults[0].id_usuario; // Guardamos el id_usuario para la notificación
      const usuarioResults = await getUserById(id_usuario_calificado);

      if (!usuarioResults || usuarioResults.length === 0) {
        await connection.rollback();
        return sendError(res, 404, "No se encontró el usuario de la empresa.");
      }

      tipo_calificado = usuarioResults[0].tipo_usuario; // 'empresa_juridico' o 'empresa_natural'

    // ✅ ===== CAMBIO AQUÍ =====
    } else if (tipoUsuario === "empresa_juridico" || tipoUsuario === "empresa_natural") {
      // Una Empresa está reseñando a un Freelancer
      // id_identificador = id_freelancer
      const [freelancer] = await connection.query(
        "SELECT id_usuario FROM freelancer WHERE id_freelancer = ?", // Obtenemos el id_usuario
        [id_identificador]
      );

      if (!freelancer || freelancer.length === 0) {
        await connection.rollback();
        return sendError(res, 404, "Freelancer no encontrado.");
      }

      id_calificado = id_identificador; // Este es el id_freelancer
      id_usuario_calificado = freelancer[0].id_usuario; // Guardamos el id_usuario para la notificación

      const usuarioResults = await getUserById(id_usuario_calificado);

      if (!usuarioResults || usuarioResults.length === 0) {
        await connection.rollback();
        return sendError(res, 404, "No se encontró el usuario asociado al freelancer.");
      }

      tipo_calificado = usuarioResults[0].tipo_usuario; // 'freelancer'
    // ✅ ===== FIN DEL CAMBIO =====

    } else {
      await connection.rollback();
      return sendError(res, 400, "El tipo de usuario que reseña no es válido.");
    }

    // Validación cruzada (no se pueden reseñar a sí mismos o del mismo tipo)
    if (tipoUsuario === tipo_calificado || 
       (tipoUsuario === 'empresa_juridico' && tipo_calificado === 'empresa_natural') ||
       (tipoUsuario === 'empresa_natural' && tipo_calificado === 'empresa_juridico')) {
      await connection.rollback();
      return sendError(res, 400, "No puedes reseñar a un usuario del mismo tipo.");
    }

    // Verificar si ya existe una reseña
    const [existingReview] = await connection.query(
      "SELECT id_resena FROM resena WHERE id_usuario = ? AND id_calificado = ?",
      [id_usuario, id_calificado]
    );

    if (existingReview && existingReview.length > 0) {
      await connection.rollback();
      return sendError(res, 409, "Ya has realizado una reseña a este usuario.");
    }

    // Insertar la reseña
    await connection.query(
      `INSERT INTO resena (id_usuario, tipo_calificado, id_calificado, calificacion, comentario, fecha_resena)
       VALUES (?, ?, ?, ?, ?, CURDATE())`,
      [id_usuario, tipo_calificado, id_calificado, calificacion, comentario]
    );

    await connection.commit();

    // --- Notificación (Lógica corregida) ---
    try {
      const { notificarNuevaResenaRecibida } = require("../../services/notificationService");
      
      // id_usuario_calificado fue obtenido en los bloques IF/ELSE de arriba
      if (id_usuario_calificado) {
        const nombreQuienResena = req.user.nombre_completo || req.user.correo || "Un usuario";
        
        // No pasamos la 'connection' porque ya se hizo commit.
        // El servicio de notificación debe manejar su propia conexión si es necesario.
        // (OJO: si la notificación falla, la reseña ya está creada. Esto es normal)
        await notificarNuevaResenaRecibida(
          id_usuario_calificado,
          nombreQuienResena,
          calificacion,
          null 
        );
      } else {
        console.error("Error de notificación: No se pudo determinar el id_usuario_calificado.");
      }
    } catch (notificationError) {
      // Es importante que un error de notificación no rompa el flujo principal
      console.error("Error al enviar la notificación de reseña:", notificationError);
    }
    
    res.status(201).json({ message: "Reseña agregada exitosamente." });

  } catch (err) {
    console.error("Error inesperado en addReview:", err);
    if (connection) await connection.rollback();
    return sendError(res, 500, "Ocurrió un error inesperado.");
  } finally {
    if (connection) connection.release();
  }
}

module.exports = {
  addReview
};
