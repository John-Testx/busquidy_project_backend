const pool = require('../../db');
const { notificarSolicitudContacto } = require('../../services/notificationService'); 

// 1. Crear solicitud
exports.createContactRequest = async (req, res) => {
    const { id_postulacion, tipo_solicitud, mensaje_solicitud, fecha_entrevista_sugerida } = req.body;
    const id_solicitante = req.user.id_usuario;

    if (!id_postulacion || !tipo_solicitud) {
        return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        
        // Obtener ID del freelancer receptor
        const [postulacion] = await connection.query(
            'SELECT id_freelancer FROM postulacion WHERE id_postulacion = ?', 
            [id_postulacion]
        );

        if (postulacion.length === 0) {
            connection.release();
            return res.status(404).json({ error: 'Postulación no encontrada' });
        }

        const [freelancer] = await connection.query(
            'SELECT id_usuario FROM freelancer WHERE id_freelancer = ?',
            [postulacion[0].id_freelancer]
        );

        if (freelancer.length === 0) {
            connection.release();
            return res.status(404).json({ error: 'Usuario freelancer no encontrado' });
        }

        const id_receptor = freelancer[0].id_usuario;

        // Insertar la solicitud
        const [result] = await connection.query(
            `INSERT INTO solicitudes_contacto 
            (id_postulacion, id_solicitante, id_receptor, tipo_solicitud, mensaje_solicitud, fecha_entrevista_sugerida, estado_solicitud) 
            VALUES (?, ?, ?, ?, ?, ?, 'pendiente')`,
            [id_postulacion, id_solicitante, id_receptor, tipo_solicitud, mensaje_solicitud, fecha_entrevista_sugerida]
        );

        // Intentar notificar
        try {
            if (notificarSolicitudContacto) {
                const [empresaInfo] = await connection.query("SELECT nombre_empresa FROM empresa WHERE id_usuario = ?", [id_solicitante]);
                const nombreSolicitante = empresaInfo.length > 0 ? empresaInfo[0].nombre_empresa : 'Una empresa';
                await notificarSolicitudContacto(id_receptor, nombreSolicitante, tipo_solicitud);
            }
        } catch (notifError) {
            console.error('Advertencia notificación:', notifError.message);
        }

        res.status(201).json({ message: 'Solicitud enviada exitosamente', id_solicitud: result.insertId });

    } catch (error) {
        console.error("Error createContactRequest:", error);
        res.status(500).json({ error: 'Error al crear la solicitud' });
    } finally {
        if (connection) connection.release();
    }
};

// 2. Obtener todas las solicitudes (Lista)
exports.getContactRequests = async (req, res) => {
    const id_usuario = req.user.id_usuario;
    try {
        // Consulta corregida: Usa LEFT JOIN con empresa y COALESCE para evitar error de columna inexistente
        const query = `
            SELECT sc.*, 
                   COALESCE(e.nombre_empresa, 'Usuario') as nombre_solicitante, 
                   p.titulo as titulo_proyecto 
            FROM solicitudes_contacto sc
            JOIN usuario u ON sc.id_solicitante = u.id_usuario
            LEFT JOIN empresa e ON u.id_usuario = e.id_usuario
            JOIN postulacion pos ON sc.id_postulacion = pos.id_postulacion
            JOIN publicacion_proyecto pub ON pos.id_publicacion = pub.id_publicacion
            JOIN proyecto p ON pub.id_proyecto = p.id_proyecto
            WHERE sc.id_receptor = ? OR sc.id_solicitante = ?
            ORDER BY sc.fecha_creacion DESC
        `;
        
        const [requests] = await pool.query(query, [id_usuario, id_usuario]);
        res.json(requests);
    } catch (error) {
        console.error("Error getContactRequests:", error);
        res.status(500).json({ error: 'Error al obtener solicitudes' });
    }
};

// 3. Obtener UNA solicitud por ID (Detalle) - AQUÍ ESTABA EL ERROR
exports.getContactRequestById = async (req, res) => {
    const { id } = req.params;
    const id_usuario = req.user.id_usuario;

    try {
        // CORRECCIÓN CRÍTICA: Eliminamos 'u_sol.nombre_completo' que causaba el error.
        // Usamos COALESCE para buscar el nombre en la tabla 'empresa' o usar el correo como respaldo.
        const query = `
            SELECT sc.*, 
                   COALESCE(e.nombre_empresa, u_sol.correo) as nombre_solicitante, 
                   u_sol.correo as correo_solicitante,
                   p.titulo as titulo_proyecto 
            FROM solicitudes_contacto sc
            JOIN usuario u_sol ON sc.id_solicitante = u_sol.id_usuario
            LEFT JOIN empresa e ON u_sol.id_usuario = e.id_usuario
            JOIN postulacion pos ON sc.id_postulacion = pos.id_postulacion
            JOIN publicacion_proyecto pub ON pos.id_publicacion = pub.id_publicacion
            JOIN proyecto p ON pub.id_proyecto = p.id_proyecto
            WHERE sc.id_solicitud = ? AND (sc.id_receptor = ? OR sc.id_solicitante = ?)
        `;

        const [request] = await pool.query(query, [id, id_usuario, id_usuario]);

        if (request.length === 0) {
            return res.status(404).json({ error: 'Solicitud no encontrada o acceso denegado' });
        }

        res.json(request[0]);
    } catch (error) {
        console.error('Error getContactRequestById:', error);
        // Si ves este mensaje en el frontend, es un error de SQL nuevo
        res.status(500).json({ error: 'Error interno de base de datos al leer la solicitud' });
    }
};

// 4. Responder Solicitud
exports.respondToRequest = async (req, res) => {
    const { id } = req.params; 
    let { estado } = req.body; // Solo necesitamos el 'estado' (aceptada/rechazada)
    const id_usuario = req.user.id_usuario;

    // ... (Pasos de validación del estado y normalización, se mantienen igual) ...

    // 1. EXTRACCIÓN INTELIGENTE DEL ESTADO
    if (estado && typeof estado === 'object') {
        if (estado.respuesta) {
            estado = estado.respuesta;
        } else if (estado.estado) {
            estado = estado.estado;
        }
    }

    // 2. Normalización
    if (estado && typeof estado === 'string') {
        estado = estado.trim().toLowerCase();
    } else {
        return res.status(400).json({ error: "Formato de estado inválido. Se espera una cadena de texto." });
    }

    // 3. Validación de valores permitidos
    if (!['aceptada', 'rechazada'].includes(estado)) {
        return res.status(400).json({ error: `Estado inválido: '${estado}'. Valores permitidos: 'aceptada', 'rechazada'.` });
    }

    // NOTA: Eliminamos la validación extra de 'fecha_entrevista' porque ya no se espera.

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction(); // Iniciar transacción

        // 4. Verificar permisos y existencia
        const [solicitud] = await connection.query(
            // CRÍTICO: Recuperamos la fecha sugerida de la base de datos
            'SELECT id_solicitud, id_postulacion, id_solicitante, id_receptor, fecha_entrevista_sugerida FROM solicitudes_contacto WHERE id_solicitud = ? AND id_receptor = ?',
            [id, id_usuario]
        );

        if (solicitud.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Solicitud no encontrada o no tienes permiso.' });
        }
        
        const data = solicitud[0];
        // CRÍTICO: Definimos la fecha de la entrevista como la fecha sugerida
        const fechaParaEntrevista = data.fecha_entrevista_sugerida;

        // Validar que la fecha sugerida exista si se acepta
        if (estado === 'aceptada' && !fechaParaEntrevista) {
             await connection.rollback();
             return res.status(400).json({ error: 'La solicitud aceptada requiere una fecha sugerida existente.' });
        }

        // 5. Actualizar la solicitud de contacto
        await connection.query(
            'UPDATE solicitudes_contacto SET estado_solicitud = ? WHERE id_solicitud = ?',
            [estado, id]
        );

        // 6. CREACIÓN DE LA ENTREVISTA
        if (estado === 'aceptada') {
            
            const id_usuario_empresa = data.id_solicitante;
            const id_usuario_freelancer = data.id_receptor; 

            // Generar un Room ID único
            const room_id = `room-${id}-${Date.now()}`; 

            // Insertar la nueva entrevista usando fechaParaEntrevista (que es la sugerida)
            await connection.query(
                `INSERT INTO entrevistas (
                    id_solicitud, 
                    id_usuario_empresa, 
                    id_usuario_freelancer, 
                    room_id, 
                    fecha_hora_inicio
                ) VALUES (?, ?, ?, ?, ?)`,
                [
                    data.id_solicitud, 
                    id_usuario_empresa, 
                    id_usuario_freelancer, 
                    room_id, 
                    fechaParaEntrevista // Usamos la fecha_entrevista_sugerida
                ]
            );
        }

        // 7. Commit la transacción
        await connection.commit();

        res.json({ 
            message: `Solicitud ${estado} exitosamente`,
            ...(estado === 'aceptada' && { 
                entrevista_creada: true, 
                fecha_agendada: fechaParaEntrevista,
                room_id: room_id
            })
        });

    } catch (error) {
        if (connection) {
            await connection.rollback(); 
        }
        console.error('Error respondToRequest:', error);
        res.status(500).json({ error: 'Error interno al procesar la respuesta o crear la entrevista' });
    } finally {
        if (connection) connection.release();
    }
};