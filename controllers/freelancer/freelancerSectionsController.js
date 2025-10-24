const { getFreelancerByUserId } = require("../../queries/freelancer/profileQueries");
const sectionQueries = require("../../queries/freelancer/sectionQueries");

/**
 * Actualizar sección específica del perfil
 */
const updateSection = async (req, res) => {
  const { id_usuario, section } = req.params;
  const updatedData = req.body;

  console.log("id_usuario:", id_usuario);
  console.log("seccion:", section);

  try {
    // Obtener freelancer
    const perfilFreelancerResults = await getFreelancerByUserId(id_usuario);
    if (perfilFreelancerResults.length === 0) {
      return res.status(404).json({ error: "No se encontró el freelancer" });
    }
    
    const id_freelancer = perfilFreelancerResults[0].id_freelancer;

    let result;

    switch (section) {
      case "informacionGeneral":
        result = await sectionQueries.updateInformacionGeneral(id_freelancer, updatedData);
        break;

      case "presentacion":
        result = await sectionQueries.updatePresentacion(id_freelancer, updatedData);
        break;

      case "formacion":
        result = await sectionQueries.updateFormacion(id_freelancer, updatedData);
        break;

      case "pretensiones":
        result = await sectionQueries.updatePretensiones(id_freelancer, updatedData);
        break;

      default:
        return res.status(400).json({ error: "Sección no válida" });
    }

    if (!result) {
      return res.status(404).json({ error: "No se encontraron datos para actualizar" });
    }

    res.json({ mensaje: "Actualización exitosa", datos: updatedData });
  } catch (error) {
    console.error(`Error al actualizar ${section}:`, error);
    res.status(500).json({ error: "Error al actualizar perfil", detalles: error.message });
  }
};

/**
 * Agregar nuevo elemento a sección
 */
const addItem = async (req, res) => {
  const { id_usuario, itemType } = req.params;
  const data = req.body;

  if (!id_usuario || !itemType) {
    return res.status(400).json({ 
      message: "El ID de usuario o el tipo de elemento no están definidos." 
    });
  }

  try {
    // Obtener freelancer
    const perfilFreelancerResults = await getFreelancerByUserId(id_usuario);
    if (perfilFreelancerResults.length === 0) {
      return res.status(404).json({ error: "No se encontró el freelancer" });
    }
    
    const id_freelancer = perfilFreelancerResults[0].id_freelancer;

    let result;

    // Seleccionar query según el itemType
    switch (itemType) {
      case "inclusionLaboral":
        result = await sectionQueries.insertInclusionLaboral(id_freelancer, data);
        break;

      case "experienciaLaboral":
        result = await sectionQueries.insertEmprendimiento(id_freelancer, data);
        break;

      case "trabajoPractica":
        result = await sectionQueries.insertTrabajoPractica(id_freelancer, data);
        break;

      case "formacion":
        result = await sectionQueries.insertNivelEducacional(id_freelancer, data);
        break;

      case "educacionSuperior":
        result = await sectionQueries.insertEducacionSuperior(id_freelancer, data);
        break;

      case "educacionBasicaMedia":
        result = await sectionQueries.insertEducacionBasicaMedia(id_freelancer, data);
        break;

      case "conocimientos":
        result = await sectionQueries.insertCurso(id_freelancer, data);
        break;

      case "idiomas":
        result = await sectionQueries.insertIdioma(id_freelancer, data);
        break;

      case "habilidades":
        result = await sectionQueries.insertHabilidad(id_freelancer, data);
        break;

      default:
        return res.status(400).json({ message: "Tipo de elemento no reconocido." });
    }

    res.status(201).json({ 
      message: `${itemType} agregado correctamente.`,
      id: result
    });
  } catch (error) {
    console.error("Error al agregar datos:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

/**
 * Eliminar idioma o habilidad
 */
const deleteItem = async (req, res) => {
  const { id_usuario, seccion, id } = req.params;

  try {
    let result;

    switch (seccion) {
      case "idiomas":
        result = await sectionQueries.deleteIdioma(id, id_usuario);
        break;

      case "habilidades":
        result = await sectionQueries.deleteHabilidad(id, id_usuario);
        break;

      default:
        return res.status(400).json({ error: "Sección no válida" });
    }

    if (!result) {
      return res.status(404).json({ error: "Dato no encontrado" });
    }

    res.json({ mensaje: `${seccion.slice(0, -1)} eliminado exitosamente` });
  } catch (error) {
    console.error(`Error al eliminar ${seccion}:`, error);
    res.status(500).json({ error: "Error al eliminar datos" });
  }
};

module.exports = {
  updateSection,
  addItem,
  deleteItem
};