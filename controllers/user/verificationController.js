const pool = require('../../db');
const gcsService = require('../../services/gcsVerificationService');
const { crearNotificacion } = require('../../services/notificationService');

/**
 * POST /api/verification/upload-docs
 * Maneja la subida de múltiples documentos
 */
const handleUpload = async (req, res) => {
    const userId = req.user.id_usuario;
    const files = req.files; // Array de archivos
    const tiposDocumentos = req.body.tiposDocumentos; // Array de strings

    try {
        if (!files || files.length === 0) {
            return res.status(400).json({ error: 'No se proporcionaron archivos' });
        }

        if (!tiposDocumentos || !Array.isArray(tiposDocumentos)) {
            return res.status(400).json({ error: 'Tipos de documento no especificados correctamente' });
        }

        if (files.length !== tiposDocumentos.length) {
            return res.status(400).json({ error: 'El número de archivos no coincide con los tipos de documento' });
        }

        console.log(`📤 Subiendo ${files.length} documentos para usuario ${userId}`);

        // Procesar cada archivo
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const tipoDocumento = tiposDocumentos[i];

            // Subir a GCS
            const publicUrl = await gcsService.uploadFile(file, userId, tipoDocumento);

            // Guardar/actualizar en BD usando ON DUPLICATE KEY UPDATE
            const query = `
                INSERT INTO documentos_verificacion 
                (id_usuario, tipo_documento, url_documento, estado_documento)
                VALUES (?, ?, ?, 'subido')
                ON DUPLICATE KEY UPDATE 
                    url_documento = VALUES(url_documento), 
                    estado_documento = 'subido',
                    comentario_rechazo = NULL,
                    fecha_subida = CURRENT_TIMESTAMP
            `;
            await pool.query(query, [userId, tipoDocumento, publicUrl]);

            console.log(`✅ Documento ${tipoDocumento} subido: ${publicUrl}`);
        }

        // Actualizar estado del usuario a 'en_revision'
        await pool.query(
            "UPDATE usuario SET estado_verificacion = 'en_revision' WHERE id_usuario = ?",
            [userId]
        );

        // Crear notificación para el Admin
        // Obtener información del usuario para la notificación
        const [userData] = await pool.query(
            "SELECT correo, tipo_usuario FROM usuario WHERE id_usuario = ?",
            [userId]
        );

        if (userData.length > 0) {
            const user = userData[0];
            
            // Obtener todos los admins
            const [admins] = await pool.query(
                "SELECT id_usuario FROM usuario WHERE tipo_usuario = 'administrador'"
            );

            // Notificar a cada admin
            for (const admin of admins) {
                await crearNotificacion({
                    id_usuario_receptor: admin.id_usuario,
                    tipo_notificacion: 'NUEVA_VERIFICACION',
                    mensaje: `Nueva solicitud de verificación de ${user.correo} (${user.tipo_usuario})`,
                    enlace: `/adminhome/verificaciones/detalle/${userId}`
                });
            }
        }

        console.log(`✅ Documentos procesados y usuario actualizado a 'en_revision'`);

        res.status(200).json({ 
            message: 'Documentos subidos exitosamente. Tu cuenta está en revisión.',
            totalUploaded: files.length
        });

    } catch (error) {
        console.error('❌ Error en handleUpload:', error);
        res.status(500).json({ error: 'Error al procesar los documentos' });
    }
};

/**
 * GET /api/verification/my-documents
 * Obtiene los documentos del usuario autenticado
 */
const getMyDocuments = async (req, res) => {
    const userId = req.user.id_usuario;

    try {
        const query = `
            SELECT 
                id_documento,
                tipo_documento,
                url_documento,
                estado_documento,
                comentario_rechazo,
                fecha_subida
            FROM documentos_verificacion
            WHERE id_usuario = ?
            ORDER BY fecha_subida DESC
        `;
        const [documentos] = await pool.query(query, [userId]);

        res.status(200).json({ documentos });

    } catch (error) {
        console.error('❌ Error al obtener documentos:', error);
        res.status(500).json({ error: 'Error al obtener los documentos' });
    }
};

module.exports = {
    handleUpload,
    getMyDocuments,
};