const pool = require('../../db');
// ✅ CORRECCIÓN: Importamos las funciones específicas que SÍ existen en tu servicio
const { 
    notificarSolicitudContacto,
    notificarSolicitudChatAceptada,
    notificarSolicitudChatRechazada,
    notificarSolicitudEntrevistaAceptada,
    notificarSolicitudEntrevistaRechazada,
    notificarSolicitudEntrevistaReprogramar,
    notificarSolicitudChatRecibida,      // Asegúrate de tener estos importados
    notificarSolicitudEntrevistaRecibida // Asegúrate de tener estos importados
} = require('../../services/notificationService');

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
        
        // ✅ CORRECCIÓN DE QUERY: Obtenemos también el TÍTULO del proyecto para la notificación
        const [postulacionData] = await connection.query(
            `SELECT p.id_freelancer, proy.titulo as titulo_proyecto 
             FROM postulacion p 
             JOIN publicacion_proyecto pp ON p.id_publicacion = pp.id_publicacion
             JOIN proyecto proy ON pp.id_proyecto = proy.id_proyecto
             WHERE p.id_postulacion = ?`, 
            [id_postulacion]
        );

        if (postulacionData.length === 0) {
            connection.release();
            return res.status(404).json({ error: 'Postulación no encontrada' });
        }

        const id_freelancer = postulacionData[0].id_freelancer;
        const tituloProyecto = postulacionData[0].titulo_proyecto; // Dato necesario para notificar

        const [freelancer] = await connection.query(
            'SELECT id_usuario FROM freelancer WHERE id_freelancer = ?',
            [id_freelancer]
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

        // ✅ LÓGICA DE NOTIFICACIÓN CORREGIDA
        try {
            const [empresaInfo] = await connection.query("SELECT nombre_empresa FROM empresa WHERE id_usuario = ?", [id_solicitante]);
            const nombreSolicitante = empresaInfo.length > 0 ? empresaInfo[0].nombre_empresa : 'Una empresa';
            
            // Usamos las funciones específicas según el tipo
            if (tipo_solicitud === 'chat') {
                // notificarSolicitudChatRecibida(id_receptor, nombre_empresa, id_solicitud)
                await notificarSolicitudChatRecibida(id_receptor, nombreSolicitante, result.insertId);
            } else if (tipo_solicitud === 'entrevista') {
                // notificarSolicitudEntrevistaRecibida(id_receptor, nombre_empresa, nombre_proyecto, fecha, id_solicitud)
                await notificarSolicitudEntrevistaRecibida(
                    id_receptor, 
                    nombreSolicitante, 
                    tituloProyecto, 
                    fecha_entrevista_sugerida, 
                    result.insertId
                );
            }
            
            console.log(`🔔 Notificación de solicitud ${tipo_solicitud} enviada al usuario ${id_receptor}`);

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

// 3. Obtener UNA solicitud por ID (Detalle)
exports.getContactRequestById = async (req, res) => {
    const { id } = req.params;
    const id_usuario = req.user.id_usuario;

    try {
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
        res.status(500).json({ error: 'Error interno de base de datos al leer la solicitud' });
    }
};

// 4. Responder Solicitud (Aceptar/Rechazar/Reprogramar)
exports.respondToRequest = async (req, res) => {
    const { id } = req.params; 
    let { estado, nueva_fecha } = req.body; 
    const id_usuario = req.user.id_usuario;

    if (estado && typeof estado === 'object') {
        if (estado.respuesta) estado = estado.respuesta;
        else if (estado.estado) estado = estado.estado;
    }

    if (estado && typeof estado === 'string') {
        estado = estado.trim().toLowerCase();
    } else {
        return res.status(400).json({ error: "Formato de estado inválido." });
    }

    if (!['aceptada', 'rechazada', 'reprogramar'].includes(estado)) {
        return res.status(400).json({ error: `Estado inválido: '${estado}'.` });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction(); 

        // ✅ Obtenemos también id_proyecto para la notificación
        const [solicitud] = await connection.query(
            `SELECT 
                sc.id_solicitud, 
                sc.id_postulacion, 
                sc.id_solicitante, 
                sc.id_receptor, 
                sc.fecha_entrevista_sugerida, 
                sc.tipo_solicitud,
                p.id_proyecto
             FROM solicitudes_contacto sc
             JOIN postulacion pos ON sc.id_postulacion = pos.id_postulacion
             JOIN publicacion_proyecto pub ON pos.id_publicacion = pub.id_publicacion
             JOIN proyecto p ON pub.id_proyecto = p.id_proyecto
             WHERE sc.id_solicitud = ? AND sc.id_receptor = ?`,
            [id, id_usuario]
        );

        if (solicitud.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Solicitud no encontrada o no tienes permiso.' });
        }
        
        const data = solicitud[0];
        const fechaParaEntrevista = (estado === 'reprogramar' && nueva_fecha) ? nueva_fecha : data.fecha_entrevista_sugerida;

        // ✅ CORRECCIÓN: Validar fecha SOLO SI es entrevista
        if (estado === 'aceptada' && data.tipo_solicitud === 'entrevista' && !fechaParaEntrevista) {
             await connection.rollback();
             return res.status(400).json({ error: 'La solicitud de entrevista aceptada requiere una fecha sugerida existente.' });
        }

        // Actualizar solicitud
        await connection.query(
            'UPDATE solicitudes_contacto SET estado_solicitud = ?, fecha_entrevista_sugerida = ? WHERE id_solicitud = ?',
            [estado, fechaParaEntrevista, id]
        );

        // ✅ LÓGICA DIFERENCIADA: Entrevista vs Chat
        let room_id = null;
        if (estado === 'aceptada') {
            if (data.tipo_solicitud === 'entrevista') {
                // Crear registro de entrevista
                const id_usuario_empresa = data.id_solicitante;
                const id_usuario_freelancer = data.id_receptor; 
                room_id = `room-${id}-${Date.now()}`; 

                await connection.query(
                    `INSERT INTO entrevistas (id_solicitud, id_usuario_empresa, id_usuario_freelancer, room_id, fecha_hora_inicio) 
                     VALUES (?, ?, ?, ?, ?)`,
                    [data.id_solicitud, id_usuario_empresa, id_usuario_freelancer, room_id, fechaParaEntrevista]
                );
            } else if (data.tipo_solicitud === 'chat') {
                // Asegurar que exista la conversación
                const [user1, user2] = [data.id_solicitante, data.id_receptor].sort((a, b) => a - b);
                const [existingConv] = await connection.query(
                    "SELECT id_conversation FROM conversations WHERE id_user_one = ? AND id_user_two = ?",
                    [user1, user2]
                );
                
                if (existingConv.length === 0) {
                    await connection.query(
                        "INSERT INTO conversations (id_user_one, id_user_two, created_at) VALUES (?, ?, NOW())",
                        [user1, user2]
                    );
                }
            }
        }

        // --- NOTIFICACIONES ---
        const [userData] = await connection.query(
            `SELECT CONCAT(ap.nombres, ' ', ap.apellidos) as nombre_freelancer 
             FROM freelancer f 
             JOIN antecedentes_personales ap ON f.id_freelancer = ap.id_freelancer 
             WHERE f.id_usuario = ?`,
            [id_usuario]
        );
        const nombreFreelancer = userData.length > 0 ? userData[0].nombre_freelancer : 'El Freelancer';
        const idUsuarioEmpresa = data.id_solicitante;

        // DB Notifications
        if (data.tipo_solicitud === 'chat') {
            if (estado === 'aceptada') {
                await notificarSolicitudChatAceptada(idUsuarioEmpresa, nombreFreelancer, null, connection);
            } else if (estado === 'rechazada') {
                await notificarSolicitudChatRechazada(idUsuarioEmpresa, nombreFreelancer, connection);
            }
        } else if (data.tipo_solicitud === 'entrevista') {
            if (estado === 'aceptada') {
                // ✅ Pasamos el id_proyecto recuperado
                await notificarSolicitudEntrevistaAceptada(idUsuarioEmpresa, nombreFreelancer, null, data.id_proyecto, connection);
            } else if (estado === 'rechazada') {
                await notificarSolicitudEntrevistaRechazada(idUsuarioEmpresa, nombreFreelancer, connection);
            } else if (estado === 'reprogramar') {
                await notificarSolicitudEntrevistaReprogramar(idUsuarioEmpresa, nombreFreelancer, fechaParaEntrevista, id, connection);
            }
        }

        // Socket.IO Notifications
        try {
            const io = req.app.get('socketio');
            if (io) {
                let tipoNotificacion = '';
                let mensajeNotificacion = '';
                let enlaceNotificacion = null;

                if (data.tipo_solicitud === 'chat') {
                    if (estado === 'aceptada') {
                        tipoNotificacion = 'solicitud_chat_aceptada';
                        mensajeNotificacion = `'${nombreFreelancer}' aceptó tu solicitud de chat.`;
                        enlaceNotificacion = `/chat`; 
                    } else if (estado === 'rechazada') {
                        tipoNotificacion = 'solicitud_chat_rechazada';
                        mensajeNotificacion = `'${nombreFreelancer}' rechazó tu solicitud de chat.`;
                    }
                } else if (data.tipo_solicitud === 'entrevista') {
                    if (estado === 'aceptada') {
                        tipoNotificacion = 'solicitud_entrevista_aceptada';
                        mensajeNotificacion = `'${nombreFreelancer}' aceptó tu invitación a la entrevista.`;
                        enlaceNotificacion = `/empresa/proyectos/${data.id_proyecto}`; 
                    } else if (estado === 'rechazada') {
                        tipoNotificacion = 'solicitud_entrevista_rechazada';
                        mensajeNotificacion = `'${nombreFreelancer}' rechazó tu invitación a la entrevista.`;
                    } else if (estado === 'reprogramar') {
                        tipoNotificacion = 'solicitud_entrevista_reprogramar';
                        mensajeNotificacion = `'${nombreFreelancer}' ha sugerido una nueva fecha para la entrevista.`;
                        enlaceNotificacion = `/solicitudes/${id}`;
                    }
                }

                if (tipoNotificacion) {
                    io.to(`user_${idUsuarioEmpresa}`).emit('new_notification', {
                        tipo: tipoNotificacion,
                        mensaje: mensajeNotificacion,
                        enlace: enlaceNotificacion,
                        fecha: new Date()
                    });
                }
            }
        } catch (socketError) {
            console.error("⚠️ Error al emitir notificación por socket:", socketError);
        }

        await connection.commit();

        res.json({ 
            message: `Solicitud ${estado} exitosamente`,
            ...(estado === 'aceptada' && data.tipo_solicitud === 'entrevista' && { 
                entrevista_creada: true, 
                fecha_agendada: fechaParaEntrevista,
                room_id: room_id
            })
        });

    } catch (error) {
        if (connection) await connection.rollback(); 
        console.error('Error respondToRequest:', error);
        res.status(500).json({ error: 'Error interno al procesar la respuesta' });
    } finally {
        if (connection) connection.release();
    }
};