const express = require('express');
const router = express.Router();
const verificationController = require('../controllers/user/verificationController');
const { verifyToken } = require('../middlewares/auth');
const multer = require('multer');

// Configurar multer para usar memoria (buffer)
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de archivo no permitido. Solo JPG, PNG y PDF.'));
        }
    }
});

/**
 * POST /api/verification/upload-docs
 * Sube múltiples documentos de verificación
 */
router.post(
    '/upload-docs', 
    verifyToken,
    upload.array('documentos', 10), // Máximo 10 archivos
    verificationController.handleUpload
);

/**
 * GET /api/verification/my-documents
 * Obtiene los documentos del usuario autenticado
 */
router.get('/my-documents', verifyToken, verificationController.getMyDocuments);

module.exports = router;