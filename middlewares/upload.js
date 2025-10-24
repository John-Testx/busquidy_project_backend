const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Asegurar que existe la carpeta de uploads
const uploadDir = "uploads/cvs";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * Configuración de almacenamiento para CVs
 */
const cvStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
    cb(null, filename);
  }
});

/**
 * Filtro de archivos para CVs (PDF, DOC, DOCX)
 */
const cvFileFilter = (req, file, cb) => {
  const allowedTypes = /pdf|doc|docx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error("Solo se permiten archivos PDF, DOC y DOCX"));
  }
};

/**
 * Middleware de upload para CVs
 */
const uploadCV = multer({
  storage: cvStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB máximo
  },
  fileFilter: cvFileFilter
});

module.exports = {
  uploadCV
};