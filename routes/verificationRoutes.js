const express = require('express');
const router = express.Router();
const verificationController = require('../controllers/user/verificationController');
const { verifyToken } = require('../middlewares/auth');
const multer = require('multer');

// Configurar multer para usar memoria (buffer) en lugar de disco
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // Límite de 5MB
    },
    fileFilter: (req, file, cb) => {
        // Aceptar solo imágenes y PDFs
        const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de archivo no permitido. Solo se aceptan JPG, PNG y PDF.'));
        }
    }
});

/**
 * Ruta pública para validar el token del email
 * GET /api/verification/verify-token/:token
 */
router.get('/verify-token/:token', verificationController.validateToken);

/**
 * Ruta para subir un documento (requiere autenticación)
 * POST /api/verification/upload-document
 */
router.post(
    '/upload-document', 
    verifyToken,
    upload.single('documento'),
    verificationController.uploadDocument
);

/**
 * Ruta para obtener los documentos del usuario
 * GET /api/verification/documents
 */
router.get('/documents', verifyToken, verificationController.getUserDocuments);

/**
 * Ruta para enviar documentos a revisión
 * POST /api/verification/submit-for-review
 */
router.post('/submit-for-review', verifyToken, verificationController.submitForReview);

module.exports = router;