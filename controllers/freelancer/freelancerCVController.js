const fs = require("fs");
const PDFDocument = require('pdfkit');
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


/**
 * Descargar CV en formato Busquidy (PDF)
 */
const downloadBusquidyCV = async (req, res) => {
  const { id_usuario } = req.params;

  try {
    // Obtener id_freelancer
    const freelancerResults = await getFreelancerByUserId(id_usuario);
    if (freelancerResults.length === 0) {
      return res.status(404).json({ error: "Freelancer no encontrado" });
    }

    const id_freelancer = freelancerResults[0].id_freelancer;

    // Obtener datos completos del perfil
    const profileData = await profileQueries.getCompleteProfileData(id_freelancer);
    const freelancerInfo = freelancerResults[0];

    // Crear PDF
    const doc = new PDFDocument({ margin: 50 });

    // Headers para descarga
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=CV_Busquidy_${freelancerInfo.id_freelancer}.pdf`);

    // Pipe el PDF al response
    doc.pipe(res);

    // ===== HEADER DEL CV =====
    doc.fontSize(24).fillColor('#07767c').text('CURRÍCULUM VITAE', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#666666').text('Generado por Busquidy', { align: 'center' });
    doc.moveDown(1);

    // ===== INFORMACIÓN PERSONAL =====
    const personal = profileData.antecedentesPersonales || {};
    doc.fontSize(16).fillColor('#07767c').text('INFORMACIÓN PERSONAL');
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#07767c');
    doc.moveDown(0.5);

    doc.fontSize(11).fillColor('#000000');
    addField(doc, 'Nombre Completo', `${personal.nombres || ''} ${personal.apellidos || ''}`);
    addField(doc, 'Correo', freelancerInfo.correo_contacto || 'No especificado');
    addField(doc, 'Teléfono', freelancerInfo.telefono_contacto || 'No especificado');
    addField(doc, 'Fecha de Nacimiento', personal.fecha_nacimiento || 'No especificada');
    addField(doc, 'RUT', personal.identificacion || 'No especificado');
    addField(doc, 'Nacionalidad', personal.nacionalidad || 'No especificada');
    addField(doc, 'Ubicación', `${personal.ciudad || ''}, ${personal.region || ''}`);
    if (freelancerInfo.linkedin_link) {
      addField(doc, 'LinkedIn', freelancerInfo.linkedin_link);
    }
    doc.moveDown(1);

    // ===== PRESENTACIÓN =====
    if (freelancerInfo.descripcion) {
      doc.fontSize(16).fillColor('#07767c').text('PRESENTACIÓN');
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#07767c');
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#000000').text(freelancerInfo.descripcion, { align: 'justify' });
      doc.moveDown(1);
    }

    // ===== EXPERIENCIA LABORAL =====
    const experiencias = profileData.trabajoPractica || [];
    if (experiencias.length > 0) {
      doc.fontSize(16).fillColor('#07767c').text('EXPERIENCIA LABORAL');
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#07767c');
      doc.moveDown(0.5);

      experiencias.forEach((exp, index) => {
        doc.fontSize(12).fillColor('#000000').text(`${exp.cargo || 'Cargo no especificado'} - ${exp.empresa || 'Empresa no especificada'}`, { bold: true });
        doc.fontSize(10).fillColor('#666666').text(`${exp.mes_inicio || ''} ${exp.ano_inicio || ''}`);
        if (exp.descripcion) {
          doc.fontSize(10).fillColor('#000000').text(exp.descripcion, { align: 'justify' });
        }
        if (index < experiencias.length - 1) doc.moveDown(0.5);
      });
      doc.moveDown(1);
    }

    // ===== EDUCACIÓN =====
    const educacionSup = profileData.educacionSuperior || [];
    if (educacionSup.length > 0) {
      doc.fontSize(16).fillColor('#07767c').text('EDUCACIÓN SUPERIOR');
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#07767c');
      doc.moveDown(0.5);

      educacionSup.forEach((edu, index) => {
        doc.fontSize(12).fillColor('#000000').text(`${edu.carrera || 'Carrera no especificada'}`, { bold: true });
        doc.fontSize(10).fillColor('#666666').text(`${edu.institucion || 'Institución no especificada'} (${edu.estado || ''})`);
        doc.fontSize(10).fillColor('#000000').text(`${edu.ano_inicio || ''} - ${edu.ano_termino || ''}`);
        if (index < educacionSup.length - 1) doc.moveDown(0.5);
      });
      doc.moveDown(1);
    }

    // ===== HABILIDADES =====
    const habilidades = profileData.habilidades || [];
    if (habilidades.length > 0) {
      doc.fontSize(16).fillColor('#07767c').text('HABILIDADES');
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#07767c');
      doc.moveDown(0.5);

      habilidades.forEach((hab, index) => {
        doc.fontSize(10).fillColor('#000000').text(`• ${hab.habilidad} - ${hab.categoria} (${hab.nivel})`);
      });
      doc.moveDown(1);
    }

    // ===== IDIOMAS =====
    const idiomas = profileData.idiomas || [];
    if (idiomas.length > 0) {
      doc.fontSize(16).fillColor('#07767c').text('IDIOMAS');
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#07767c');
      doc.moveDown(0.5);

      idiomas.forEach((idioma) => {
        doc.fontSize(10).fillColor('#000000').text(`• ${idioma.idioma} - ${idioma.nivel}`);
      });
      doc.moveDown(1);
    }

    // ===== CURSOS Y CERTIFICACIONES =====
    const cursos = profileData.curso || [];
    if (cursos.length > 0) {
      doc.fontSize(16).fillColor('#07767c').text('CURSOS Y CERTIFICACIONES');
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#07767c');
      doc.moveDown(0.5);

      cursos.forEach((curso) => {
        doc.fontSize(10).fillColor('#000000').text(`• ${curso.nombre_curso} - ${curso.institucion} (${curso.mes_inicio} ${curso.ano_inicio})`);
      });
      doc.moveDown(1);
    }

    // ===== FOOTER =====
    doc.moveDown(2);
    doc.fontSize(8).fillColor('#999999').text(
      'Este documento fue generado automáticamente por Busquidy',
      { align: 'center' }
    );
    doc.text(
      `Fecha de generación: ${new Date().toLocaleDateString('es-CL')}`,
      { align: 'center' }
    );

    // Finalizar PDF
    doc.end();

  } catch (error) {
    console.error("Error al generar CV Busquidy:", error);
    res.status(500).json({ error: "Error al generar el CV", details: error.message });
  }
};

/**
 * Helper para agregar campos al PDF
 */
function addField(doc, label, value) {
  doc.fontSize(10).fillColor('#666666').text(`${label}: `, { continued: true })
     .fillColor('#000000').text(value || 'No especificado');
}

module.exports = {
  uploadCV,
  getCVUrl,
  downloadBusquidyCV,
};