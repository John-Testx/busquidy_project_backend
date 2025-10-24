const fs = require("fs");
const { getFreelancerByUserId } = require("../../queries/freelancer/profileQueries");
const { procesarArchivoCV, procesarCV } = require("../../services/cvService");
const profileQueries = require("../../queries/freelancer/profileQueries");

/**
 * Subir y procesar CV
 */
const uploadCV = async (req, res) => {
  const file = req.file;
  const id_usuario = req.body.id_usuario;

  console.log("Archivo recibido:", req.file);
  console.log("Cuerpo de la solicitud (req.body):", req.body);

  if (!file) {
    return res.status(400).json({ error: "No se ha proporcionado ningún archivo." });
  }

  try {
    const cv_url = `/uploads/cvs/${file.filename}`;

    // Procesar el archivo (PDF o Word)
    const extractedText = await procesarArchivoCV(file);

    // Obtener id_freelancer
    const freelancerResults = await getFreelancerByUserId(id_usuario);
    if (freelancerResults.length === 0) {
      // Limpiar archivo subido
      fs.unlinkSync(file.path);
      return res.status(404).json({ error: "Freelancer no encontrado" });
    }

    const id_freelancer = freelancerResults[0].id_freelancer;

    console.log("Texto extraído del archivo:", extractedText);

    // Procesar el texto extraído
    const perfilData = await procesarCV(extractedText);

    console.log("Datos procesados para guardar en la DB:", perfilData);

    // Actualizar información del freelancer
    if (perfilData.freelancer) {
      await profileQueries.updateFreelancerInfo(id_freelancer, {
        correo_contacto: perfilData.freelancer.correo_contacto,
        telefono_contacto: perfilData.freelancer.telefono_contacto,
        linkedin_link: perfilData.freelancer.linkedin_link,
        descripcion_freelancer: perfilData.freelancer.descripcion_freelancer
      });
    }

    // Insertar antecedentes personales si existen
    if (perfilData.antecedentes_personales) {
      await profileQueries.insertAntecedentesPersonales(
        id_freelancer, 
        perfilData.antecedentes_personales
      );
    }

    // Insertar pretensiones si existen
    if (perfilData.pretensiones) {
      await profileQueries.insertPretensiones(
        id_freelancer, 
        perfilData.pretensiones
      );
    }

    // Actualizar CV URL
    await profileQueries.updateCVUrl(id_freelancer, cv_url);

    console.log("Perfil creado exitosamente:", perfilData);

    // Enviar la respuesta final
    return res.status(201).json({ 
      message: "Perfil creado exitosamente.", 
      cv_url 
    });
  } catch (error) {
    console.error("Error al procesar el CV:", error);
    
    // Limpiar el archivo subido en caso de error
    if (file && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    // Enviar la respuesta de error
    return res.status(500).json({ error: "Error al procesar el archivo." });
  }
};

/**
 * Obtener URL del CV
 */
const getCVUrl = async (req, res) => {
  const idFreelancer = req.params.id;

  try {
    const cv_url = await profileQueries.getCVUrl(idFreelancer);

    if (cv_url) {
      res.status(200).json({ cv_url });
    } else {
      res.status(404).json({ error: "Freelancer no encontrado o CV no disponible" });
    }
  } catch (error) {
    console.error("Error al obtener la URL del CV:", error);
    res.status(500).json({ error: "Error al obtener el CV" });
  }
};

module.exports = {
  uploadCV,
  getCVUrl
};