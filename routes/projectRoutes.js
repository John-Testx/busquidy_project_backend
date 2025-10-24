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
  releaseProjectPayment  // <- NUEVO
} = require("../controllers/project/projectController");

const {
  updateProjectState,
  updateProjectStatus,
  getAllPublications
} = require("../controllers/project/publicationController");

// ============= RUTAS DE PROYECTOS =============
router.get("/getProjects", getAllProjects);
router.get("/getProject/:id", getProjectById);
router.put("/updateProject/:id", updateProject);
router.post("/create-project", verifyToken, createProject);
router.delete("/delete/:id_proyecto", deleteProject);
router.get("/get/:id_usuario", getProjectsByUser);

// ============= LIBERACIÓN DE PAGO (NUEVO) =============
router.post("/release-payment/:id_proyecto", verifyToken, releaseProjectPayment);

// ============= RUTAS DE PUBLICACIONES =============
router.put("/update-proyecto-state/:id_proyecto", updateProjectState);
router.put("/api/proyecto/estado/:id_proyecto", updateProjectStatus);
router.get("/publicacion", getAllPublications);

module.exports = router;