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

/**
 * Agregar nuevo ítem a una sección del perfil
 */
const addSectionItem = async (req, res) => {
  const { tipo_seccion, ...data } = req.body;
  const id_usuario = req.user.id_usuario; // Obtenido del token JWT

  if (!tipo_seccion) {
    return res.status(400).json({ error: "El tipo de sección es requerido" });
  }

  try {
    // Obtener id_freelancer
    const perfilFreelancerResults = await getFreelancerByUserId(id_usuario);
    if (perfilFreelancerResults.length === 0) {
      return res.status(404).json({ error: "Freelancer no encontrado" });
    }
    
    const id_freelancer = perfilFreelancerResults[0].id_freelancer;

    let result;

    // Mapear tipo_seccion a la función de query correspondiente
    switch (tipo_seccion) {
      case "experiencia":
        result = await sectionQueries.addExperiencia(data, id_freelancer);
        break;
      
      case "educacion_superior":
        result = await sectionQueries.addEducacionSuperior(data, id_freelancer);
        break;
      
      case "educacion_basica":
        result = await sectionQueries.addEducacionBasica(data, id_freelancer);
        break;
      
      case "curso":
        result = await sectionQueries.addCurso(data, id_freelancer);
        break;
      
      case "idioma":
        result = await sectionQueries.addIdioma(data, id_freelancer);
        break;
      
      case "habilidad":
        result = await sectionQueries.addHabilidad(data, id_freelancer);
        break;
      
      case "inclusion_laboral":
        result = await sectionQueries.addInclusionLaboral(data, id_freelancer);
        break;
      
      case "emprendimiento":
        result = await sectionQueries.addEmprendimiento(data, id_freelancer);
        break;

      default:
        return res.status(400).json({ error: "Tipo de sección no válido" });
    }

    res.status(201).json({ 
      message: "Ítem agregado exitosamente",
      id: result
    });
  } catch (error) {
    console.error("Error al agregar ítem:", error);
    res.status(500).json({ error: "Error al agregar ítem" });
  }
};

/**
 * Actualizar ítem existente en una sección
 */
const updateSectionItem = async (req, res) => {
  const { itemId } = req.params;
  const { tipo_seccion, ...data } = req.body;
  const id_usuario = req.user.id_usuario;

  if (!tipo_seccion) {
    return res.status(400).json({ error: "El tipo de sección es requerido" });
  }

  try {
    // Obtener id_freelancer
    const perfilFreelancerResults = await getFreelancerByUserId(id_usuario);
    if (perfilFreelancerResults.length === 0) {
      return res.status(404).json({ error: "Freelancer no encontrado" });
    }
    
    const id_freelancer = perfilFreelancerResults[0].id_freelancer;

    let result;

    switch (tipo_seccion) {
      case "informacion_general":
        result = await sectionQueries.updateInformacionGeneral(id_freelancer, data);
        break;

      case "formacion":
        // Para formacion, el itemId es el id_nivel_educacional
        result = await sectionQueries.updateNivelEducacional(itemId, data, id_freelancer);
        break;

      case "experiencia":
        result = await sectionQueries.updateExperiencia(itemId, data, id_freelancer);
        break;
      
      case "educacion_superior":
        result = await sectionQueries.updateEducacionSuperior(itemId, data, id_freelancer);
        break;
      
      case "educacion_basica":
        result = await sectionQueries.updateEducacionBasica(itemId, data, id_freelancer);
        break;
      
      case "curso":
        result = await sectionQueries.updateCurso(itemId, data, id_freelancer);
        break;
      
      case "idioma":
        result = await sectionQueries.updateIdioma(itemId, data, id_freelancer);
        break;
      
      case "habilidad":
        result = await sectionQueries.updateHabilidad(itemId, data, id_freelancer);
        break;
      
      case "inclusion_laboral":
        result = await sectionQueries.updateInclusionLaboral(itemId, data, id_freelancer);
        break;
      
      case "emprendimiento":
        result = await sectionQueries.updateEmprendimiento(itemId, data, id_freelancer);
        break;

      case "presentacion":
        result = await sectionQueries.updatePresentacion(id_freelancer, data);
        break;

      case "pretensiones":
        result = await sectionQueries.updatePretensiones(id_freelancer, data);
        break;

      default:
        return res.status(400).json({ error: "Tipo de sección no válido" });
    }

    if (!result) {
      return res.status(404).json({ error: "Ítem no encontrado o no tienes permisos" });
    }

    res.json({ message: "Ítem actualizado exitosamente" });
  } catch (error) {
    console.error("Error al actualizar ítem:", error);
    res.status(500).json({ error: "Error al actualizar ítem" });
  }
};

/**
 * Eliminar ítem de una sección
 */
const deleteSectionItem = async (req, res) => {
  const { itemId } = req.params;
  const { tipo_seccion } = req.body;
  const id_usuario = req.user.id_usuario;

  if (!tipo_seccion) {
    return res.status(400).json({ error: "El tipo de sección es requerido" });
  }

  try {
    // Obtener id_freelancer
    const perfilFreelancerResults = await getFreelancerByUserId(id_usuario);
    if (perfilFreelancerResults.length === 0) {
      return res.status(404).json({ error: "Freelancer no encontrado" });
    }
    
    const id_freelancer = perfilFreelancerResults[0].id_freelancer;

    let result;

    switch (tipo_seccion) {
      case "inclusion_laboral":
        result = await sectionQueries.deleteInclusionLaboral(itemId, id_freelancer);
        break;

      case "emprendimiento":
        result = await sectionQueries.deleteEmprendimiento(itemId, id_freelancer); 
        break;

      case "experiencia":
        result = await sectionQueries.deleteExperiencia(itemId, id_freelancer);
        break;
      
      case "educacion_superior":
        result = await sectionQueries.deleteEducacionSuperior(itemId, id_freelancer);
        break;
      
      case "educacion_basica":
        result = await sectionQueries.deleteEducacionBasica(itemId, id_freelancer);
        break;
      
      case "curso":
        result = await sectionQueries.deleteCurso(itemId, id_freelancer);
        break;
      
      case "idioma":
        result = await sectionQueries.deleteIdioma(itemId, id_freelancer);
        break;
      
      case "habilidad":
        result = await sectionQueries.deleteHabilidad(itemId, id_freelancer);
        break;

      default:
        return res.status(400).json({ error: "Tipo de sección no válido" });
    }

    if (!result) {
      return res.status(404).json({ error: "Ítem no encontrado o no tienes permisos" });
    }

    res.json({ message: "Ítem eliminado exitosamente" });
  } catch (error) {
    console.error("Error al eliminar ítem:", error);
    res.status(500).json({ error: "Error al eliminar ítem" });
  }
};

module.exports = {
  updateSection,
  addItem,
  deleteItem,
  addSectionItem,      // NUEVO
  updateSectionItem,   // NUEVO
  deleteSectionItem 
};