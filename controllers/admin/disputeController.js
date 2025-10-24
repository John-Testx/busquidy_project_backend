const pool = require("../../db");
const garantiaQueries = require("../../queries/payment/garantiaQueries");

/**
 * Controlador de disputas y reembolsos
 */

/**
 * Obtiene todos los proyectos con pagos en garantía
 */
const getDisputedProjects = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        p.id_proyecto,
        p.titulo,
        p.descripcion,
        e.nombre_empresa,
        pg.monto_retenido,
        pg.estado as estado_pago,
        pg.fecha_creacion as fecha_pago,
        pp.estado_publicacion,
        pg.id as id_garantia
      FROM PagosEnGarantia pg
      INNER JOIN proyecto p ON pg.id_proyecto = p.id_proyecto
      INNER JOIN empresa e ON p.id_empresa = e.id_empresa
      LEFT JOIN publicacion_proyecto pp ON p.id_proyecto = pp.id_proyecto
      WHERE pg.estado IN ('RETENIDO', 'LIBERADO', 'REEMBOLSADO')
      ORDER BY pg.fecha_creacion DESC
    `);

    res.json(rows);
  } catch (error) {
    console.error("Error al obtener proyectos con disputas:", error);
    res.status(500).json({ 
      error: "Error al obtener proyectos",
      mensaje: error.message 
    });
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