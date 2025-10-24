const { insertPago, insertPagoDetalleProyecto } = require("../../queries/payment/transactionQueries");
const { insertGarantia } = require("../../queries/payment/garantiaQueries");

/**
 * Procesar pago de publicación de proyecto
 * @param {Object} connection - Conexión de base de datos
 * @param {Object} data - Datos del pago
 * @returns {Promise<number>} ID del pago creado
 */
const processProjectPayment = async (connection, { idUsuario, idProyecto, monto, metodoPago, token, status }) => {
  await connection.beginTransaction();
  
  try {
    console.log('🔄 [processProjectPayment] Iniciando procesamiento...');
    console.log('📋 Datos recibidos:', { idUsuario, idProyecto, monto, metodoPago, token, status });

    const estadoPago = status === "APPROVED" ? "completado" : "fallido";
    const pubEstado = status === "APPROVED" ? "activo" : "sin publicar";

    // 1. Insertar pago
    console.log('💳 Insertando pago en tabla `pago`...');
    const pagoId = await insertPago(connection, {
      idUsuario,
      monto,
      estadoPago,
      metodoPago,
      referenciaExterna: token,
      tipoPago: "proyecto"
    });
    console.log(`✅ Pago insertado con ID: ${pagoId}`);

    // 2. Insertar detalle de pago de proyecto
    console.log('📝 Insertando detalle de pago en `pago_detalle_proyecto`...');
    await insertPagoDetalleProyecto(connection, pagoId, idProyecto);
    console.log('✅ Detalle de pago insertado');

    // 3. Actualizar estado de publicación del proyecto
    if (status === "APPROVED") {
      console.log('✅ Pago APROBADO - Actualizando publicación y creando garantía...');
      
      // Actualizar publicación del proyecto
      console.log('📢 Actualizando estado de publicación...');
      await connection.query(
        `UPDATE publicacion_proyecto 
         SET fecha_creacion = CURDATE(), 
             fecha_publicacion = CURDATE(), 
             estado_publicacion = ? 
         WHERE id_proyecto = ?`,
        [pubEstado, idProyecto]
      );
      console.log('✅ Publicación actualizada a estado:', pubEstado);

      // ✅ CRÍTICO: Insertar en PagosEnGarantia
      console.log('💰 Creando registro en PagosEnGarantia...');
      console.log('📊 Datos para garantía:', { idProyecto, monto, token });
      
      try {
        const garantiaId = await insertGarantia(connection, {
          id_proyecto: idProyecto,
          monto_retenido: monto,
          id_transaccion_webpay: token
        });
        console.log(`✅✅✅ Pago en garantía creado exitosamente con ID: ${garantiaId}`);
      } catch (garantiaError) {
        console.error('❌❌❌ Error al insertar en PagosEnGarantia:', garantiaError);
        throw garantiaError; // Re-lanzar el error para hacer rollback
      }

    } else {
      console.log('❌ Pago RECHAZADO - Solo actualizando estado de publicación');
      await connection.query(
        `UPDATE publicacion_proyecto 
         SET estado_publicacion = ? 
         WHERE id_proyecto = ?`,
        [pubEstado, idProyecto]
      );
    }

    await connection.commit();
    console.log('✅ Transacción completada con éxito');
    return pagoId;
    
  } catch (err) {
    console.error('❌ Error en processProjectPayment:', err);
    await connection.rollback();
    console.log('🔄 Rollback ejecutado');
    throw err;
  }
};

module.exports = {
  processProjectPayment,
};