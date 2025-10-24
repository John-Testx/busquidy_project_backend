const publicationQueries = require("../../queries/project/publicationQueries");

/**
 * Controlador de publicaciones de proyectos
 */

// Actualizar estado de publicación (cancelar)
const updateProjectState = async (req, res) => {
  const { id_proyecto } = req.params;

  if (!id_proyecto || isNaN(id_proyecto)) {
    return res.status(400).json({ error: "ID de proyecto inválido" });
  }

  try {
    const updated = await publicationQueries.updatePublicationStatus(id_proyecto, 'cancelado');

    if (!updated) {
      return res.status(404).json({ error: "No se encontró publicación para bajar" });
    }

    res.json({ mensaje: "Actualización exitosa" });
  } catch (error) {
    console.error("Error al intentar bajar la publicación", error);
    res.status(500).json({ 
      error: "Error al bajar publicación", 
      detalles: error.message 
    });
  }
};

// Actualizar estado general de proyecto
const updateProjectStatus = async (req, res) => {
  const { id_proyecto } = req.params;
  const { nuevoEstado } = req.body;

  try {
    const updated = await publicationQueries.updatePublicationStatus(id_proyecto, nuevoEstado);

    if (!updated) {
      return res.status(404).json({ error: "Publicación no encontrada" });
    }

    res.status(200).json({ message: "Estado del proyecto actualizado con éxito" });
  } catch (error) {
    console.error("Error al actualizar el estado:", error);
    res.status(500).json({ message: "Error al actualizar el estado del proyecto" });
  }
};

// Obtener todas las publicaciones con proyectos
const getAllPublications = async (req, res) => {
  try {
    const results = await publicationQueries.findProjectsWithPublicationsDetailed();

    if (results.length === 0) {
      return res.status(404).json({ error: "No se encontraron proyectos ni publicaciones." });
    }

    // Mapear resultados con estado predeterminado
    const projectsWithStatus = results.map((row) => ({
      id_proyecto: row.id_proyecto,
      id_empresa: row.id_empresa,
      titulo: row.titulo,
      descripcion: row.descripcion,
      categoria: row.categoria,
      habilidades_requeridas: row.habilidades_requeridas,
      presupuesto: row.presupuesto,
      duracion_estimada: row.duracion_estimada,
      fecha_limite: row.fecha_limite,
      ubicacion: row.ubicacion,
      tipo_contratacion: row.tipo_contratacion,
      metodologia_trabajo: row.metodologia_trabajo,
      estado_publicacion: row.estado_publicacion || "sin publicar",
      fecha_creacion: row.fecha_creacion || null,
      fecha_publicacion: row.fecha_publicacion || null,
      id_publicacion: row.id_publicacion || null,
    }));

    res.json(projectsWithStatus);
  } catch (error) {
    console.error("Error al obtener los datos:", error);
    res.status(500).json({ error: "Error al obtener los datos" });
  }
};

module.exports = {
  updateProjectState,
  updateProjectStatus,
  getAllPublications
};