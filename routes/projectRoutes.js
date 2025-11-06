const express = require("express");
const router = express.Router();
const { verifyToken, optionalAuth } = require("../middlewares/auth");

// Importar controladores
const {
  getAllProjects,
  getProjectById,
  updateProject,
  createProject,
  deleteProject,
  getProjectsByUser,
  releaseProjectPayment
} = require("../controllers/project/projectController");

const {
  updateProjectState,
  updateProjectStatus,
  getAllPublications
} = require("../controllers/project/publicationController");

// Importar controlador de postulaciones
const {
  getPostulationsByProjectId,
  getPostulationsByPublicationId,
  checkIfUserAppliedToPublication,
  createPostulation,
  hireFreelancer,
} = require("../controllers/project/postulationController");

// ============= RUTAS DE PROYECTOS =============
router.get("/getProjects", getAllProjects);
router.get("/getProject/:id", getProjectById);
router.put("/updateProject/:id", updateProject);
router.post("/create-project", verifyToken, createProject);
router.delete("/delete/:id_proyecto", deleteProject);
router.get("/get/:id_usuario", getProjectsByUser);

// ============= LIBERACIÓN DE PAGO =============
router.post("/release-payment/:id_proyecto", verifyToken, releaseProjectPayment);

// ============= RUTAS DE PUBLICACIONES =============
router.put("/update-proyecto-state/:id_proyecto", updateProjectState);
router.put("/api/proyecto/estado/:id_proyecto", updateProjectStatus);
router.get("/publicacion", getAllPublications);

// ============= RUTAS DE POSTULACIONES =============
router.get("/:id_proyecto/postulaciones", getPostulationsByProjectId);
router.get("/publicacion/:id_publicacion/postulaciones", getPostulationsByPublicationId);
router.post('/postulations/:id_postulacion/hire', verifyToken, hireFreelancer);

// Nueva ruta para verificar si el usuario ya postuló (requiere autenticación)
router.get("/publicacion/:id_publicacion/check-application", optionalAuth, checkIfUserAppliedToPublication);

// Nueva ruta para crear postulación (requiere autenticación)
router.post("/publicacion/:id_publicacion/postular", verifyToken, createPostulation);

module.exports = router;