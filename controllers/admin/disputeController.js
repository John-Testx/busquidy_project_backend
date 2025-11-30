const pool = require("../../db");
const garantiaQueries = require("../../queries/payment/garantiaQueries");

/**
 * Obtiene todos los proyectos con DISPUTAS ACTIVAS
 */
const getDisputedProjects = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        d.id_disputa,
        d.motivo,
        d.fecha_creacion as fecha_disputa,
        d.estado as estado_disputa,
        p.id_proyecto,
        p.titulo,
        e.nombre_empresa,
        pg.monto_retenido,
        pg.estado as estado_pago,
        u1.correo as correo_cliente,
        u2.correo as correo_freelancer
      FROM disputa d
      JOIN proyecto p ON d.id_proyecto = p.id_proyecto
      JOIN empresa e ON p.id_empresa = e.id_empresa
      JOIN usuario u1 ON d.id_usuario_reportante = u1.id_usuario
      JOIN usuario u2 ON d.id_usuario_reportado = u2.id_usuario
      LEFT JOIN PagosEnGarantia pg ON p.id_proyecto = pg.id_proyecto
      WHERE d.estado IN ('pendiente', 'en_proceso')
      ORDER BY d.fecha_creacion DESC
    `);

    res.json(rows);
  } catch (error) {
    console.error("Error al obtener disputas:", error);
    res.status(500).json({ error: "Error al obtener disputas" });
  }
};

/**
 * Procesa el reembolso de un pago en garantía
 */
const refundProjectPayment = async (req, res) => {
  const { id_proyecto } = req.params;
  // const id_admin = req.user.id; // Si quieres registrar qué admin hizo el reembolso

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Verificar que el proyecto existe
    const [projectRows] = await connection.query(
      `SELECT * FROM proyecto WHERE id_proyecto = ?`,
      [id_proyecto]
    );

    if (projectRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Proyecto no encontrado" });
    }

    // 2. Verificar que existe un pago en garantía RETENIDO
    const [garantiaRows] = await connection.query(
      `SELECT * FROM PagosEnGarantia WHERE id_proyecto = ? AND estado = 'RETENIDO'`,
      [id_proyecto]
    );

    if (garantiaRows.length === 0) {
      await connection.rollback();
      return res.status(400).json({ 
        error: "No hay pago en garantía para este proyecto o ya fue procesado" 
      });
    }

    const garantia = garantiaRows[0];

    console.log(`🔄 Procesando reembolso - Proyecto: ${id_proyecto}, Monto: ${garantia.monto_retenido}`);

    // 3. Actualizar estado en PagosEnGarantia a REEMBOLSADO
    await connection.query(
      `UPDATE PagosEnGarantia 
       SET estado = 'REEMBOLSADO', 
           fecha_actualizacion = NOW()
       WHERE id = ?`,
      [garantia.id]
    );

    // 4. Actualizar estado del proyecto a 'cancelado' o 'disputa resuelta'
    await connection.query(
      `UPDATE publicacion_proyecto 
       SET estado_publicacion = 'cancelado'
       WHERE id_proyecto = ?`,
      [id_proyecto]
    );

    // 5. (Opcional) Registrar en tabla de auditoría
    // await connection.query(
    //   `INSERT INTO auditoria_reembolsos (id_proyecto, id_admin, monto, fecha)
    //    VALUES (?, ?, ?, NOW())`,
    //   [id_proyecto, id_admin, garantia.monto_retenido]
    // );

    await connection.commit();

    res.status(200).json({
      success: true,
      message: "Reembolso procesado exitosamente",
      data: {
        id_proyecto: id_proyecto,
        monto_reembolsado: garantia.monto_retenido,
        nuevo_estado: "REEMBOLSADO"
      }
    });

  } catch (error) {
    console.error("❌ Error al procesar reembolso:", error);
    if (connection) await connection.rollback();
    res.status(500).json({ 
      error: "Error al procesar el reembolso",
      mensaje: error.message 
    });
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  getDisputedProjects,
  refundProjectPayment
};