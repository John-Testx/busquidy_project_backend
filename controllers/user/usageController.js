const pool = require("../../db");

/**
 * Obtiene el uso del plan del usuario logueado
 */
const getUsage = async (req, res) => {
  try {
    const userId = req.user.id_usuario;
    const userRole = req.user.tipo_usuario;

    // Obtener la suscripción activa
    const [suscripciones] = await pool.query(
      `SELECT s.*, p.nombre as plan_nombre, p.creditos_publicacion, p.creditos_postulacion
       FROM suscripcion s
       INNER JOIN plan p ON s.id_plan = p.id_plan
       WHERE s.id_usuario = ? AND s.estado = 'activa'
       ORDER BY s.fecha_inicio DESC
       LIMIT 1`,
      [userId]
    );

    if (suscripciones.length === 0) {
      return res.json({
        hasPlan: false,
        planName: "Sin Plan",
        publicacionesDisponibles: 0,
        publicacionesUsadas: 0,
        postulacionesDisponibles: 0,
        postulacionesUsadas: 0,
      });
    }

    const suscripcion = suscripciones[0];

    // Contar publicaciones usadas (solo para empresas)
    let publicacionesUsadas = 0;
    if (userRole === "empresa_juridico" || userRole === "empresa_natural") {
      const [countPub] = await pool.query(
        `SELECT COUNT(*) as total
         FROM proyecto pr
         INNER JOIN empresa e ON pr.id_empresa = e.id_empresa
         WHERE e.id_usuario = ? AND pr.fecha_creacion >= ?`,
        [userId, suscripcion.fecha_inicio]
      );
      publicacionesUsadas = countPub[0].total;
    }

    // Contar postulaciones usadas (solo para freelancers)
    let postulacionesUsadas = 0;
    if (userRole === "freelancer") {
      const [countPost] = await pool.query(
        `SELECT COUNT(*) as total
         FROM postulacion po
         INNER JOIN freelancer f ON po.id_freelancer = f.id_freelancer
         WHERE f.id_usuario = ? AND po.fecha_postulacion >= ?`,
        [userId, suscripcion.fecha_inicio]
      );
      postulacionesUsadas = countPost[0].total;
    }

    res.json({
      hasPlan: true,
      planName: suscripcion.plan_nombre,
      publicacionesDisponibles: suscripcion.creditos_publicacion || 0,
      publicacionesUsadas: publicacionesUsadas,
      postulacionesDisponibles: suscripcion.creditos_postulacion || 0,
      postulacionesUsadas: postulacionesUsadas,
      fechaInicio: suscripcion.fecha_inicio,
      fechaFin: suscripcion.fecha_fin,
    });
  } catch (error) {
    console.error("Error al obtener uso del plan:", error);
    res.status(500).json({ error: "Error al obtener información del plan" });
  }
};

module.exports = { getUsage };