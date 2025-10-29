const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/auth");

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
  getPostulationsByPublicationId
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

// ============= RUTAS DE POSTULACIONES (NUEVO) =============
router.get("/:id_proyecto/postulaciones", getPostulationsByProjectId);
router.get("/publicacion/:id_publicacion/postulaciones", getPostulationsByPublicationId);

module.exports = router;