const userQueries = require('../../queries/user/userQueries');
const gcsService = require('../../services/gcsVerificationService');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const pool = require('../../db');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Valida el token de verificación y genera un JWT para autenticar al usuario
 */
const validateToken = async (req, res) => {
    const { token } = req.params;

    try {
        if (!token) {
            return res.status(400).json({ error: 'Token no proporcionado' });
        }

        // Hashear el token para comparar
        const hashedToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        // Buscar usuario por token
        const user = await userQueries.findUserByVerificationToken(hashedToken);

        if (!user) {
            return res.status(400).json({ 
                error: 'Token inválido o expirado. Solicita un nuevo enlace de verificación.' 
            });
        }

        // Generar JWT para que el usuario pueda subir documentos
        const jwtToken = jwt.sign(
            { 
                id_usuario: user.id_usuario, 
                tipo_usuario: user.tipo_usuario 
            },
            JWT_SECRET,
            { expiresIn: '2h' }
        );

        console.log(`✅ Token validado para usuario ID: ${user.id_usuario}`);

        res.status(200).json({
            message: 'Token válido',
            token: jwtToken,
            user: {
                id_usuario: user.id_usuario,
                correo: user.correo,
                tipo_usuario: user.tipo_usuario
            }
        });

    } catch (error) {
        console.error('Error al validar token:', error);
        res.status(500).json({ error: 'Error al validar el token' });
    }
};

/**
 * Sube un documento a GCS y registra en la BD
 */
const uploadDocument = async (req, res) => {
    const userId = req.user.id_usuario;
    const { tipo_documento } = req.body;
    const file = req.file;

    try {
        if (!file) {
            return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
        }

        if (!tipo_documento) {
            return res.status(400).json({ error: 'Tipo de documento no especificado' });
        }

        // Validar tipos de documentos permitidos
        const tiposPermitidos = ['dni_frente', 'dni_reverso', 'antecedentes', 'comprobante_domicilio'];
        if (!tiposPermitidos.includes(tipo_documento)) {
            return res.status(400).json({ error: 'Tipo de documento no válido' });
        }

        console.log(`Subiendo documento ${tipo_documento} para usuario ${userId}`);

        // Subir a GCS
        const publicUrl = await gcsService.uploadFile(file, userId, tipo_documento);

        // Guardar/actualizar en la BD
        const query = `
            INSERT INTO documentos_verificacion (id_usuario, tipo_documento, url_documento, estado_documento)
            VALUES (?, ?, ?, 'subido')
            ON DUPLICATE KEY UPDATE 
                url_documento = VALUES(url_documento), 
                estado_documento = 'subido',
                fecha_subida = CURRENT_TIMESTAMP
        `;
        await pool.query(query, [userId, tipo_documento, publicUrl]);

        console.log(`✅ Documento ${tipo_documento} subido exitosamente para usuario ${userId}`);

        res.status(200).json({ 
            message: 'Documento subido con éxito', 
            url: publicUrl,
            tipo_documento 
        });

    } catch (error) {
        console.error('Error al subir documento:', error);
        res.status(500).json({ error: 'Error al subir el documento' });
    }
};

/**
 * Obtiene todos los documentos del usuario
 */
const getUserDocuments = async (req, res) => {
    const userId = req.user.id_usuario;

    try {
        const query = `
            SELECT tipo_documento, url_documento, estado_documento, fecha_subida, comentario_rechazo
            FROM documentos_verificacion
            WHERE id_usuario = ?
            ORDER BY fecha_subida DESC
        `;
        const [documentos] = await pool.query(query, [userId]);

        res.status(200).json({ documentos });

    } catch (error) {
        console.error('Error al obtener documentos:', error);
        res.status(500).json({ error: 'Error al obtener los documentos' });
    }
};

/**
 * Envía todos los documentos a revisión
 */
const submitForReview = async (req, res) => {
    const userId = req.user.id_usuario;

    try {
        // Obtener el tipo de usuario para validar documentos requeridos
        const [userResult] = await pool.query(
            'SELECT tipo_usuario FROM usuario WHERE id_usuario = ?',
            [userId]
        );

        if (userResult.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const tipoUsuario = userResult[0].tipo_usuario;

        // Obtener documentos subidos
        const [documentos] = await pool.query(
            'SELECT tipo_documento FROM documentos_verificacion WHERE id_usuario = ? AND estado_documento = "subido"',
            [userId]
        );

        const tiposSubidos = documentos.map(doc => doc.tipo_documento);

        // Validar documentos requeridos según tipo de usuario
        let documentosRequeridos = ['dni_frente', 'dni_reverso'];
        
        if (tipoUsuario === 'freelancer') {
            documentosRequeridos.push('antecedentes');
        } else if (tipoUsuario === 'empresa_juridico' || tipoUsuario === 'empresa_natural') {
            documentosRequeridos.push('comprobante_domicilio');
        }

        const faltantes = documentosRequeridos.filter(doc => !tiposSubidos.includes(doc));

        if (faltantes.length > 0) {
            return res.status(400).json({ 
                error: 'Faltan documentos requeridos',
                documentos_faltantes: faltantes 
            });
        }

        // Actualizar estado de verificación del usuario
        await userQueries.updateVerificationStatus(userId, 'en_revision');

        // Actualizar estado de todos los documentos
        await pool.query(
            'UPDATE documentos_verificacion SET estado_documento = "en_revision" WHERE id_usuario = ?',
            [userId]
        );

        console.log(`✅ Documentos enviados a revisión para usuario ${userId}`);

        // TODO: Aquí puedes enviar una notificación al admin o crear un registro en una tabla de tareas

        res.status(200).json({ 
            message: 'Documentos enviados a revisión exitosamente. Te notificaremos cuando sean aprobados.' 
        });

    } catch (error) {
        console.error('Error al enviar documentos a revisión:', error);
        res.status(500).json({ error: 'Error al procesar la solicitud' });
    }
};

module.exports = {
    validateToken,
    uploadDocument,
    getUserDocuments,
    submitForReview,
};