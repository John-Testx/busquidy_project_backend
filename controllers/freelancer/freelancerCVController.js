const fs = require("fs");
const { getFreelancerByUserId } = require("../../queries/freelancer/profileQueries");
const { parseCV } = require("../../services/cvService");
const profileQueries = require("../../queries/freelancer/profileQueries");
const sectionQueries = require("../../queries/freelancer/sectionQueries");

/**
 * Subir y procesar CV con Google Document AI
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

    // Obtener id_freelancer
    const freelancerResults = await getFreelancerByUserId(id_usuario);
    if (freelancerResults.length === 0) {
      // Limpiar archivo subido
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      return res.status(404).json({ error: "Freelancer no encontrado" });
    }

    const id_freelancer = freelancerResults[0].id_freelancer;

    console.log("Procesando CV con Google Document AI...");

    // Procesar el CV con Document AI
    const parsedData = await parseCV(file.path, file.mimetype);

    console.log("Datos procesados por Document AI:", JSON.stringify(parsedData, null, 2));

    // Guardar datos en la base de datos
    await guardarDatosEnDB(id_freelancer, parsedData, cv_url);

    console.log("Perfil actualizado exitosamente con datos del CV");

    return res.status(200).json({
      message: "CV procesado y perfil actualizado correctamente.",
      cv_url,
      data: parsedData,
    });

  } catch (error) {
    console.error("Error al procesar el CV:", error);

    // Limpiar el archivo subido en caso de error
    if (file && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
      } catch (unlinkError) {
        console.error("Error al eliminar archivo:", unlinkError);
      }
    }

    return res.status(500).json({
      error: "Error al procesar el archivo.",
      details: error.message,
    });
  }
};

/**
 * Guardar todos los datos parseados en la base de datos
 */
async function guardarDatosEnDB(id_freelancer, parsedData, cv_url) {
  try {
    // 1. Actualizar información del freelancer
    if (parsedData.freelancer) {
      await profileQueries.updateFreelancerInfo(id_freelancer, {
        correo_contacto: parsedData.freelancer.correo_contacto,
        telefono_contacto: parsedData.freelancer.telefono_contacto,
        linkedin_link: parsedData.freelancer.linkedin_link,
        descripcion_freelancer: parsedData.freelancer.descripcion_freelancer,
      });
      console.log("✓ Información del freelancer actualizada");
    }

    // 2. Insertar o actualizar antecedentes personales
    if (parsedData.antecedentes_personales) {
      const { exists } = await profileQueries.checkFreelancerProfileExists(id_freelancer);
      
      if (exists) {
        // Si ya existe, podrías crear una función de actualización
        console.log("⚠ Antecedentes personales ya existen, considera crear función de actualización");
      } else {
        await profileQueries.insertAntecedentesPersonales(
          id_freelancer,
          parsedData.antecedentes_personales
        );
        console.log("✓ Antecedentes personales insertados");
      }
    }

    // 3. Insertar experiencias laborales
    if (parsedData.experiencias && parsedData.experiencias.length > 0) {
      for (const exp of parsedData.experiencias) {
        await sectionQueries.insertTrabajoPractica(id_freelancer, exp);
      }
      console.log(`✓ ${parsedData.experiencias.length} experiencias laborales insertadas`);
    }

    // 4. Insertar educación superior
    if (parsedData.educaciones && parsedData.educaciones.length > 0) {
      for (const edu of parsedData.educaciones) {
        await sectionQueries.insertEducacionSuperior(id_freelancer, {
          institucion_superior: edu.institucion,
          carrera: edu.carrera,
          carrera_afin: null,
          estado_superior: edu.estado,
          ano_inicio_su: edu.ano_inicio,
          ano_termino_su: edu.ano_termino,
        });
      }
      console.log(`✓ ${parsedData.educaciones.length} educaciones insertadas`);
    }

    // 5. Insertar habilidades
    if (parsedData.habilidades && parsedData.habilidades.length > 0) {
      await profileQueries.insertHabilidades(id_freelancer, parsedData.habilidades);
      console.log(`✓ ${parsedData.habilidades.length} habilidades insertadas`);
    }

    // 6. Insertar idiomas
    if (parsedData.idiomas && parsedData.idiomas.length > 0) {
      for (const idioma of parsedData.idiomas) {
        await sectionQueries.insertIdioma(id_freelancer, idioma);
      }
      console.log(`✓ ${parsedData.idiomas.length} idiomas insertados`);
    }

    // 7. Insertar cursos/certificaciones
    if (parsedData.cursos && parsedData.cursos.length > 0) {
      for (const curso of parsedData.cursos) {
        await sectionQueries.insertCurso(id_freelancer, curso);
      }
      console.log(`✓ ${parsedData.cursos.length} cursos insertados`);
    }

    // 8. Insertar pretensiones
    if (parsedData.pretensiones) {
      await profileQueries.insertPretensiones(id_freelancer, parsedData.pretensiones);
      console.log("✓ Pretensiones insertadas");
    }

    // 9. Actualizar CV URL
    await profileQueries.updateCVUrl(id_freelancer, cv_url);
    console.log("✓ URL del CV actualizada");

  } catch (error) {
    console.error("Error al guardar datos en BD:", error);
    throw error;
  }
}

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
  getCVUrl,
};