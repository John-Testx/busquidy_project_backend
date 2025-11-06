const { Storage } = require('@google-cloud/storage');
const path = require('path');

// Configurar Google Cloud Storage
const storage = new Storage({
    keyFilename: process.env.GCS_KEYFILE_PATH,
    projectId: process.env.GCS_PROJECT_ID,
});

const bucket = storage.bucket(process.env.GCS_VERIFICATION_BUCKET);

/**
 * Sube un archivo a Google Cloud Storage
 * @param {Object} file - Archivo de multer (req.file)
 * @param {number} userId - ID del usuario
 * @param {string} tipoDocumento - Tipo de documento (ej: 'dni_frente', 'antecedentes')
 * @returns {Promise<string>} URL pública del archivo
 */
const uploadFile = (file, userId, tipoDocumento) => {
    return new Promise((resolve, reject) => {
        const fileName = `user_${userId}/${tipoDocumento}_${Date.now()}${path.extname(file.originalname)}`;
        const blob = bucket.file(fileName);
        
        const blobStream = blob.createWriteStream({
            resumable: false,
            metadata: {
                contentType: file.mimetype,
            },
        });

        blobStream.on('error', (err) => {
            console.error('Error al subir archivo a GCS:', err);
            reject(err);
        });

        blobStream.on('finish', () => {
            // Hacer el archivo público
            blob.makePublic().then(() => {
                const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
                resolve(publicUrl);
            }).catch(reject);
        });

        blobStream.end(file.buffer);
    });
};

/**
 * Elimina un archivo de Google Cloud Storage
 * @param {string} fileUrl - URL del archivo a eliminar
 * @returns {Promise<boolean>}
 */
const deleteFile = async (fileUrl) => {
    try {
        const fileName = fileUrl.split(`${bucket.name}/`)[1];
        if (!fileName) return false;
        
        await bucket.file(fileName).delete();
        console.log(`Archivo eliminado: ${fileName}`);
        return true;
    } catch (error) {
        console.error('Error al eliminar archivo:', error);
        return false;
    }
};

module.exports = { 
    uploadFile, 
    deleteFile,
    bucket 
};