const pool = require("../../db");
const { crearNotificacion } = require("../../services/notificationService");
const { generateV4ReadSignedUrl } = require("../../services/gcsVerificationService");

/**
 * GET /api/admin/verificacion/usuarios
 * Lista usuarios con estado_verificacion = 'en_revision'
 */
const getVerificationUsers = async (req, res) => {
    try {
        const [users] = await pool.query(`
            SELECT 
                id_usuario, 
                correo, 
                tipo_usuario, 
                estado_verificacion,
                DATE_FORMAT(ultimo_login, '%Y-%m-%d %H:%i:%s') as fecha_creacion
            FROM usuario 
            WHERE estado_verificacion = 'en_revision'
            ORDER BY ultimo_login DESC
        `);
        
        res.json(users);
    } catch (error) {
        console.error('❌ Error en getVerificationUsers:', error);
        res.status(500).json({ error: 'Error al obtener usuarios pendientes' });
    }
};

/**
 * GET /api/admin/verificacion/documentos/:userId
 * Obtiene los documentos de un usuario específico
 */
const getVerificationDocsForUser = async (req, res) => {
    const { userId } = req.params;

    try {
        const [user] = await pool.query(
            "SELECT id_usuario, correo, tipo_usuario, estado_verificacion FROM usuario WHERE id_usuario = ?",
            [userId]
        );

        if (user.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const [documents] = await pool.query(
            "SELECT * FROM documentos_verificacion WHERE id_usuario = ?",
            [userId]
        );
        const documentsWithSignedUrls = await Promise.all(
            documents.map(async (doc) => {
                // Generamos la URL firmada para la visualización
                const signedUrl = await generateV4ReadSignedUrl(doc.url_documento);
                return {
                    ...doc,
                    url_documento: signedUrl // ¡Aquí está la magia!
                };
            })
        );

        res.json({
            user: user[0],
            documents: documentsWithSignedUrls 
        });

    } catch (error) {
        console.error('❌ Error en getVerificationDocsForUser:', error);
        res.status(500).json({ error: 'Error al obtener documentos del usuario' });
    }
};

/**
 * POST /api/admin/verificacion/approve/:userId
 * Aprueba la verificación de un usuario
 */
const approveUser = async (req, res) => {
    const { userId } = req.params;

    try {
        // Actualizar estado del usuario
        await pool.query(
            "UPDATE usuario SET estado_verificacion = 'verificado' WHERE id_usuario = ?",
            [userId]
        );

        // Actualizar todos los documentos del usuario
        await pool.query(
            "UPDATE documentos_verificacion SET estado_documento = 'aprobado' WHERE id_usuario = ?",
            [userId]
        );

        // Obtener correo del usuario para la notificación
        const [userData] = await pool.query(
            "SELECT correo FROM usuario WHERE id_usuario = ?",
            [userId]
        );

        if (userData.length > 0) {
            const userEmail = userData[0].correo;

            // Crear notificación de aprobación
            await crearNotificacion({
                id_usuario_receptor: userId,
                tipo_notificacion: 'VERIFICACION_APROBADA',
                mensaje: `¡Tu cuenta ha sido verificada! Ya puedes acceder a todas las funciones de Busquidy.`,
                enlace: '/'
            });

            console.log(`✅ Usuario ${userId} (${userEmail}) aprobado`);
        }

        res.json({ message: 'Usuario aprobado exitosamente' });

    } catch (error) {
        console.error('❌ Error en approveUser:', error);
        res.status(500).json({ error: 'Error al aprobar usuario' });
    }
};

/**
 * POST /api/admin/verificacion/reject/:userId
 * Rechaza la verificación de un usuario con comentarios
 * Body: { documentos: [{ id_documento: 1, comentario: 'No legible' }] }
 */
const rejectUser = async (req, res) => {
    const { userId } = req.params;
    const { documentos } = req.body; // Array de { id_documento, comentario }

    try {
        // Actualizar estado del usuario a 'rechazado'
        await pool.query(
            "UPDATE usuario SET estado_verificacion = 'rechazado' WHERE id_usuario = ?",
            [userId]
        );

        // Si se proporcionaron comentarios específicos por documento
        if (documentos && Array.isArray(documentos) && documentos.length > 0) {
            for (const doc of documentos) {
                await pool.query(
                    `UPDATE documentos_verificacion 
                     SET estado_documento = 'rechazado', 
                         comentario_rechazo = ? 
                     WHERE id_documento = ? AND id_usuario = ?`,
                    [doc.comentario, doc.id_documento, userId]
                );
            }
        } else {
            // Si no hay comentarios específicos, marcar todos como rechazados
            await pool.query(
                "UPDATE documentos_verificacion SET estado_documento = 'rechazado' WHERE id_usuario = ?",
                [userId]
            );
        }

        // Obtener correo del usuario para la notificación
        const [userData] = await pool.query(
            "SELECT correo FROM usuario WHERE id_usuario = ?",
            [userId]
        );

        if (userData.length > 0) {
            const userEmail = userData[0].correo;

            // Crear notificación de rechazo
            await crearNotificacion({
                id_usuario_receptor: userId,
                tipo_notificacion: 'VERIFICACION_RECHAZADA',
                mensaje: `Tu solicitud de verificación fue rechazada. Revisa los comentarios y vuelve a subir tus documentos.`,
                enlace: '/verificar-documentos'
            });

            console.log(`❌ Usuario ${userId} (${userEmail}) rechazado`);
        }

        res.json({ message: 'Usuario rechazado exitosamente' });

    } catch (error) {
        console.error('❌ Error en rejectUser:', error);
        res.status(500).json({ error: 'Error al rechazar usuario' });
    }
};

module.exports = {
    getVerificationUsers,
    getVerificationDocsForUser,
    approveUser,
    rejectUser,
};