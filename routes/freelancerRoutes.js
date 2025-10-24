const express = require("express");
const router = express.Router();

// Importar middlewares
const { verifyToken } = require("../middlewares/auth");
const { uploadCV } = require("../middlewares/upload");

// Importar controllers
const profileController = require("../controllers/freelancer/freelancerProfileController");
const sectionsController = require("../controllers/freelancer/freelancerSectionsController");
const applicationController = require("../controllers/freelancer/freelancerApplicationController");
const searchController = require("../controllers/freelancer/freelancerSearchController");
const cvController = require("../controllers/freelancer/freelancerCVController");
const availabilityRoutes = require('./availabilityRoutes');

// ============================================
// RUTAS DE PERFIL
// ============================================
// Verificar si existe perfil
router.get("/get/:id_usuario", profileController.checkProfileExists);

// Obtener perfil completo del freelancer (propio)
router.get("/perfil-freelancer/:id_usuario", profileController.getOwnProfile);

// Crear perfil completo de freelancer
router.post("/create-perfil-freelancer", verifyToken, profileController.createProfile);

// Actualizar perfil (legacy - mantener por compatibilidad)
router.put("/update/:id", profileController.updateProfileLegacy);

// ============================================
// RUTAS DE SECCIONES DEL PERFIL
// ============================================
// Actualizar sección específica del perfil
router.put("/update-freelancer/:id_usuario/:section", sectionsController.updateSection);

// Agregar elementos a secciones (idiomas, habilidades, experiencia, etc.)
router.post("/add-freelancer/:id_usuario/:itemType", sectionsController.addItem);

// Eliminar idioma o habilidad
router.delete("/delete-idioma-habilidad/:id_usuario/:seccion/:id", sectionsController.deleteItem);

// ============================================
// RUTAS DE BÚSQUEDA Y LISTADO
// ============================================
// Listar todos los freelancers
router.get("/list", searchController.listFreelancers);

// Obtener perfil público de un freelancer específico
router.get("/freelancer-perfil/:id", searchController.getFreelancerPublicProfile);

// ============================================
// RUTAS DE POSTULACIONES
// ============================================
// Crear postulación a un proyecto
router.post("/postulacion/:id_publicacion", applicationController.createApplication);

// Obtener postulaciones del freelancer
router.get("/postulaciones/:id_usuario", applicationController.getApplications);

// Eliminar postulación
router.delete("/delete-postulacion/:id_postulacion", applicationController.deleteApplication);

// ============================================
// RUTAS DE CV
// ============================================
// Subir y procesar CV
router.post("/upload-cv", uploadCV.single("cv"), cvController.uploadCV);

// Obtener URL del CV
router.get("/freelancer/:id/cv", cvController.getCVUrl);


// Rutas para la gestión de disponibilidad del freelancer
router.use('/availability', availabilityRoutes);



module.exports = router;