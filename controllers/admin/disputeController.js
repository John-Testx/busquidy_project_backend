const pool = require("../../db");
const garantiaQueries = require("../../queries/payment/garantiaQueries");
const { generatePDF } = require("../../services/pdfService");

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

/**
 * Resolver disputa y ejecutar movimiento financiero (Admin)
 */
const resolveDispute = async (req, res) => {
  const { id_disputa } = req.params;
  const { resolucion } = req.body; // 'ganador_estudiante' | 'decision_dividida'
  // const id_admin = req.user.id_usuario; // Auditoría opcional

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Obtener datos de la disputa
    const [rows] = await connection.query(`
      SELECT d.*, pg.monto_retenido, pg.id as id_garantia, p.titulo, p.id_empresa,
             u_free.id_usuario as id_freelancer_user,
             u_cli.id_usuario as id_cliente_user,
             e.nombre_empresa
      FROM disputa d
      JOIN proyecto p ON d.id_proyecto = p.id_proyecto
      JOIN empresa e ON p.id_empresa = e.id_empresa
      JOIN PagosEnGarantia pg ON p.id_proyecto = pg.id_proyecto
      JOIN usuario u_free ON d.id_usuario_reportado = u_free.id_usuario
      JOIN usuario u_cli ON d.id_usuario_reportante = u_cli.id_usuario
      WHERE d.id_disputa = ? AND pg.estado = 'RETENIDO'
    `, [id_disputa]);

    if (rows.length === 0) {
      throw new Error("Disputa no encontrada o fondos ya procesados.");
    }
    const data = rows[0];
    const montoTotal = Number(data.monto_retenido);

    if (resolucion === 'ganador_estudiante') {
        // --- ESCENARIO B: Gana Estudiante ---
        // Se paga todo al estudiante. (¿Se cobra comisión? El doc dice "Orden normal", asumimos SÍ)
        const comision = Math.round(montoTotal * 0.05);
        const pago = montoTotal - comision;

        // Generar Factura Comisión (Busquidy gana igual porque el servicio existió)
        const pdfFactura = await generatePDF('FACTURA_COMISION', {
            id_proyecto: data.id_proyecto,
            nombre_empresa: data.nombre_empresa,
            monto_comision: comision
        });
        await connection.query(`INSERT INTO factura_comision (id_proyecto, id_empresa, monto_comision, url_pdf) VALUES (?, ?, ?, ?)`, 
            [data.id_proyecto, data.id_empresa, comision, pdfFactura]);

        // Generar Orden Pago Estudiante
        const pdfOrden = await generatePDF('ORDEN_PAGO', {
            id_proyecto: data.id_proyecto,
            titulo_proyecto: data.titulo,
            nombre_receptor: "Freelancer (Ganador Disputa)",
            monto: pago
        });
        await connection.query(`INSERT INTO orden_pago (id_proyecto, id_usuario_receptor, monto, tipo, estado, url_pdf) VALUES (?, ?, ?, 'pago_honorario', 'pendiente', ?)`,
            [data.id_proyecto, data.id_freelancer_user, pago, pdfOrden]);
        
        // Actualizar Disputa
        await connection.query("UPDATE disputa SET estado = 'resuelta_pago', fecha_actualizacion = NOW() WHERE id_disputa = ?", [id_disputa]);

    } else if (resolucion === 'decision_dividida') {
        // --- ESCENARIO C: Salomónica (50/50) ---
        // Se devuelve 50% al cliente y 50% al estudiante.
        // ¿Comisión? Generalmente en reembolsos parciales se cobra sobre lo pagado o nada. Asumamos SIN comisión para simplificar el reembolso.
        const mitad = montoTotal / 2;

        // Orden 1: Pago Estudiante
        const pdfOrdenEst = await generatePDF('ORDEN_PAGO', {
            id_proyecto: data.id_proyecto,
            titulo_proyecto: `[DISPUTA 50%] ${data.titulo}`,
            nombre_receptor: "Freelancer (Resolución Salomónica)",
            monto: mitad
        });
        await connection.query(`INSERT INTO orden_pago (id_proyecto, id_usuario_receptor, monto, tipo, estado, url_pdf) VALUES (?, ?, ?, 'pago_honorario', 'pendiente', ?)`,
            [data.id_proyecto, data.id_freelancer_user, mitad, pdfOrdenEst]);

        // Orden 2: Reembolso Cliente
        const pdfOrdenCli = await generatePDF('ORDEN_PAGO', {
            id_proyecto: data.id_proyecto,
            titulo_proyecto: `[REEMBOLSO 50%] ${data.titulo}`,
            nombre_receptor: data.nombre_empresa,
            monto: mitad
        });
        await connection.query(`INSERT INTO orden_pago (id_proyecto, id_usuario_receptor, monto, tipo, estado, url_pdf) VALUES (?, ?, ?, 'reembolso_cliente', 'pendiente', ?)`,
            [data.id_proyecto, data.id_cliente_user, mitad, pdfOrdenCli]);

        // Actualizar Disputa
        await connection.query("UPDATE disputa SET estado = 'resuelta_reembolso', fecha_actualizacion = NOW() WHERE id_disputa = ?", [id_disputa]);
    } else {
        throw new Error("Tipo de resolución no válido.");
    }

    // Liberar garantía y finalizar proyecto
    await connection.query("UPDATE PagosEnGarantia SET estado = 'LIBERADO' WHERE id = ?", [data.id_garantia]);
    await connection.query("UPDATE publicacion_proyecto SET estado_publicacion = 'cancelado' WHERE id_proyecto = ?", [data.id_proyecto]);

    await connection.commit();
    res.json({ message: "Disputa resuelta y órdenes generadas." });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error(error);
    res.status(500).json({ error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  getDisputedProjects,
  refundProjectPayment,
  resolveDispute
};