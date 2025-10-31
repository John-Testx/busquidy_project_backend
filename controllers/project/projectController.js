const projectQueries = require("../../queries/project/projectQueries");
const publicationQueries = require("../../queries/project/publicationQueries");
const { getEmpresaByUserId } = require("../../queries/empresa/empresaQueries.js");

const {getUserById} = require("../../queries/user/userQueries");
const pool = require("../../db");

// ✅ --- IMPORTS ACTUALIZADOS ---
const { 
    notificarPostulacionRecibida, 
    notificarNuevaPostulacion,
    notificarPostulacionAceptada,
    notificarPostulacionRechazada
} = require("../../services/notificationService");
const { getPostulacionData } = require("../../queries/notification/notificationHelperQueries");
// ✅ --- NUEVO IMPORT DEL GUARDIÁN ---
const { checkUsageLimit } = require("../../services/subscriptionService");


/**
 * Controlador de gestión de proyectos
 */

// Obtener todos los proyectos con publicaciones
const getAllProjects = async (req, res) => {
  try {
    const proyectos = await projectQueries.findAllProjectsWithPublications();

    if (proyectos.length === 0) {
      return res.status(404).json({ error: "No se encontraron proyectos" });
    }

    res.json(proyectos);
  } catch (error) {
    console.error("Error al obtener proyectos:", error);
    res.status(500).json({
      error: "Error interno del servidor",
      mensaje: error.message,
    });
  }
};

// Obtener proyecto por ID
const getProjectById = async (req, res) => {
  const { id } = req.params;

  try {
    const project = await projectQueries.findProjectById(id);

    if (!project) {
      return res.status(404).json({ error: "Proyecto no encontrado" });
    }

    res.json(project);
  } catch (error) {
    console.error("Error al obtener proyecto:", error);
    res.status(500).json({ 
      error: "Error interno del servidor", 
      mensaje: error.message 
    });
  }
};

// Actualizar proyecto
const updateProject = async (req, res) => {
  const { id } = req.params;
  const projectData = req.body;

  try {
    const updated = await projectQueries.updateProject(id, projectData);

    if (!updated) {
      return res.status(404).json({ error: "Proyecto no encontrado" });
    }

    res.json({ message: "Proyecto actualizado correctamente" });
  } catch (error) {
    console.error("Error al actualizar proyecto:", error);
    res.status(500).json({ 
      error: "Error interno del servidor", 
      mensaje: error.message 
    });
  }
};

// Crear proyecto
const createProject = async (req, res) => {
  const { projectData, id_usuario } = req.body;
  console.log("Datos recibidos para crear proyecto:", projectData, "ID usuario:", id_usuario);

  if (!id_usuario) {
    console.error("Error: id_usuario es undefined o null");
    return res.status(400).json({ error: "ID de usuario inválido" });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Verificar usuario
    const userCheckResults = await getUserById(id_usuario);
    if (userCheckResults.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const tipo_usuario = userCheckResults[0].tipo_usuario;
    
    // (Lógica de Tipo de Usuario - OK)
    if (tipo_usuario !== "empresa_juridico" && tipo_usuario !== "empresa_natural") {
      await connection.rollback();
      return res.status(403).json({ error: "Acceso no autorizado" });
    }

    // (Lógica de Proyecto vs Tarea - OK)
    const { tipo } = projectData; // 'proyecto' o 'tarea'
    
    if (!tipo) {
      await connection.rollback();
      return res.status(400).json({ error: "El campo 'tipo' (proyecto o tarea) es requerido." });
    }

    if (tipo_usuario === 'empresa_juridico' && tipo !== 'proyecto') {
        await connection.rollback();
        return res.status(403).json({ error: 'Las empresas jurídicas solo pueden publicar proyectos.' });
    }

    if (tipo_usuario === 'empresa_natural' && tipo !== 'tarea') {
        await connection.rollback();
        return res.status(403).json({ error: 'Las empresas naturales solo pueden publicar tareas.' });
    }
    
    // ✅ ===== GUARDIÁN DE LÍMITES (PUBLICACIÓN) =====
    const tipo_accion_publicar = (tipo === 'proyecto') ? 'publicacion_proyecto' : 'publicacion_tarea';
    const puedePublicar = await checkUsageLimit(id_usuario, tipo_accion_publicar, connection);

    if (!puedePublicar) {
        await connection.rollback();
        return res.status(403).json({ message: 'Has alcanzado el límite de publicaciones para tu plan.' });
    }
    // ✅ ===== FIN DEL GUARDIÁN =====


    // Obtener `id_empresa`
    const empresaResults = await getEmpresaByUserId(id_usuario);
    if (empresaResults.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Empresa no encontrada" });
    }

    const id_empresa = empresaResults[0].id_empresa;

    // Verificar duplicados
    const projectCheckResults = await projectQueries.checkDuplicateProject(id_empresa, projectData);
    console.log("Resultado de duplicados:", projectCheckResults);
    if (projectCheckResults.length > 0) {
      await connection.rollback();
      return res.status(409).json({ error: "Proyecto duplicado encontrado" });
    }

    // Insertar proyecto
    const id_proyecto = await projectQueries.insertProject(projectData, id_empresa, connection);

    // Crear publicación
    await publicationQueries.insertProjectPublication(id_proyecto, connection);

    await connection.commit();
    console.log("Proyecto y publicación creados con éxito");
    res.status(200).json({
      message: "Proyecto y publicación creados con éxito",
      projectId: id_proyecto,
    });
  } catch (err) {
    console.error("Error al crear el proyecto:", err);
    if (connection) await connection.rollback();
    // Devuelve el mensaje de error del guardián si existe
    res.status(err.message.includes("límite") ? 403 : 500).json({ error: err.message || "Error interno del servidor" });
  } finally {
    if (connection) await connection.release();
  }
};

// Eliminar proyecto
const deleteProject = async (req, res) => {
  const { id_proyecto } = req.params;
  let connection;

  try {
    connection = await pool.getConnection();

    // Verificar si el proyecto existe
    const exists = await projectQueries.existsProject(id_proyecto, connection);
    if (!exists) {
      return res.status(404).json({
        success: false,
        message: "Proyecto no encontrado",
      });
    }

    // Iniciar transacción
    await connection.beginTransaction();

    try {
      // Eliminar publicación relacionada
      await publicationQueries.deletePublication(id_proyecto, connection);

      // Eliminar el proyecto
      await projectQueries.deleteProject(id_proyecto, connection);

      // Confirmar transacción
      await connection.commit();

      res.status(200).json({
        success: true,
        message: "Proyecto eliminado correctamente",
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error("Error al eliminar proyecto:", error);
    res.status(500).json({
      success: false,
      message: "Error al eliminar el proyecto",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Obtener proyectos por usuario
const getProjectsByUser = async (req, res) => {
  const { id_usuario } = req.params;
  console.log("id_usuario:", id_usuario);

  if (!id_usuario) {
    console.error("Error: id_usuario es undefined o null");
    return res.status(400).json({ error: "ID de usuario inválido" });
  }

  try {
    // Verificar usuario
    const userCheckResults = await getUserById(id_usuario);
    if (userCheckResults.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const tipo_usuario = userCheckResults[0].tipo_usuario;
    
    // (Lógica de Tipo de Usuario - OK)
    if (tipo_usuario !== "empresa_juridico" && tipo_usuario !== "empresa_natural") {
      return res.status(403).json({ error: "Acceso no autorizado" });
    }
    
    // Obtener `id_empresa`
    const empresaResults = await getEmpresaByUserId(id_usuario);
    if (empresaResults.length === 0) {
      console.error("Empresa no encontrada para el usuario:", id_usuario);
      return res.status(404).json({ error: "Empresa no encontrada" });
    }

    const id_empresa = empresaResults[0].id_empresa;

    // Obtener proyectos
    const projectResults = await projectQueries.findProjectsByEmpresaId(id_empresa);

    if (projectResults.length === 0) {
      console.log("No se encontraron proyectos");
      return res.status(404).json({ error: "No se encontraron proyectos" });
    }

    // Obtener estados de publicación
    const projectIds = projectResults.map((proyecto) => proyecto.id_proyecto);
    const publicationResults = await publicationQueries.findPublicationStatusByProjectIds(projectIds);

    // Mapear estados a proyectos
    const publicationMap = new Map(
      publicationResults.map((pub) => [pub.id_proyecto, pub.estado_publicacion])
    );
    const projectsWithStatus = projectResults.map((proyecto) => ({
      ...proyecto,
      estado_publicacion: publicationMap.get(proyecto.id_proyecto) || "Desconocido",
    }));

    res.json(projectsWithStatus);
  } catch (error) {
    console.error("Error al obtener proyectos:", error.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

/**
 * Libera el pago en garantía y marca el proyecto como completado
 */
const releaseProjectPayment = async (req, res) => {
  const { id_proyecto } = req.params;
  const id_usuario = req.user.id_usuario; // Del middleware verifyToken

  console.log('🔍 Liberando pago - Usuario:', id_usuario, 'Proyecto:', id_proyecto);

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Verificar que el proyecto existe y obtener el id_empresa
    const [projectRows] = await connection.query(
      `SELECT p.*, p.id_empresa 
       FROM proyecto p
       WHERE p.id_proyecto = ?`,
      [id_proyecto]
    );

    if (projectRows.length === 0) {
      await connection.rollback();
      console.log('❌ Proyecto no encontrado');
      return res.status(404).json({ error: "Proyecto no encontrado" });
    }

    const proyecto = projectRows[0];
    console.log('📋 Proyecto encontrado:', proyecto);

    // 2. Verificar que el usuario es dueño de la empresa del proyecto
    const [empresaRows] = await connection.query(
      `SELECT id_empresa, id_usuario 
       FROM empresa 
       WHERE id_empresa = ?`,
      [proyecto.id_empresa]
    );

    if (empresaRows.length === 0) {
      await connection.rollback();
      console.log('❌ Empresa no encontrada');
      return res.status(404).json({ error: "Empresa no encontrada" });
    }

    console.log('🏢 Empresa encontrada:', empresaRows[0]);
    console.log('👤 Usuario actual:', id_usuario, 'Usuario dueño:', empresaRows[0].id_usuario);

    if (empresaRows[0].id_usuario !== id_usuario) {
      await connection.rollback();
      console.log('❌ Usuario no tiene permiso');
      return res.status(403).json({ error: "No tienes permiso para completar este proyecto" });
    }

    // 3. Verificar que existe un pago en garantía RETENIDO
    const [garantiaRows] = await connection.query(
      `SELECT * FROM PagosEnGarantia WHERE id_proyecto = ? AND estado = 'RETENIDO'`,
      [id_proyecto]
    );

    if (garantiaRows.length === 0) {
      await connection.rollback();
      console.log('❌ No hay pago en garantía RETENIDO');
      return res.status(400).json({ 
        error: "No hay pago en garantía para este proyecto o ya fue procesado" 
      });
    }

    const garantia = garantiaRows[0];
    console.log('💰 Pago en garantía encontrado:', garantia);
    
    // 4. Calcular comisión (10%) y monto neto
    const comision = garantia.monto_retenido * 0.10;
    const monto_neto = garantia.monto_retenido - comision;

    console.log(`💰 Liberando pago - Monto: ${garantia.monto_retenido}, Comisión: ${comision}, Neto: ${monto_neto}`);

    // 5. Actualizar estado en PagosEnGarantia
    await connection.query(
      `UPDATE PagosEnGarantia 
       SET estado = 'LIBERADO', 
           fecha_actualizacion = NOW()
       WHERE id = ?`,
      [garantia.id]
    );

    console.log('✅ Estado de pago actualizado a LIBERADO');

    // 6. Actualizar estado del proyecto a 'finalizado'
    await connection.query(
      `UPDATE publicacion_proyecto 
       SET estado_publicacion = 'finalizado'
       WHERE id_proyecto = ?`,
      [id_proyecto]
    );

    console.log('✅ Estado del proyecto actualizado a finalizado');

    await connection.commit();
    console.log('✅ Transacción completada exitosamente');

    res.status(200).json({
      success: true,
      message: "Pago liberado exitosamente al freelancer",
      data: {
        monto_total: garantia.monto_retenido,
        comision: comision,
        monto_freelancer: monto_neto
      }
    });

  } catch (error) {
    console.error("❌ Error al liberar pago:", error);
    if (connection) await connection.rollback();
    res.status(500).json({ 
      error: "Error al liberar el pago",
      mensaje: error.message 
    });
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Controlador de postulaciones
 */

// ✅ NUEVA FUNCIÓN: Crear postulación
const crearPostulacion = async (req, res) => {
  const { id_publicacion } = req.body;
  const { id: id_usuario } = req.user; // Usuario freelancer autenticado (ID viene de req.user.id)
  
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Obtener id_freelancer del usuario
    const [freelancer] = await connection.query(
      "SELECT id_freelancer FROM freelancer WHERE id_usuario = ?",
      [id_usuario]
    );

    if (!freelancer || freelancer.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Freelancer no encontrado" });
    }

    const id_freelancer = freelancer[0].id_freelancer;

    
    // ✅ ===== GUARDIÁN DE LÍMITES (POSTULACIÓN) =====
    // 1. Averiguar el tipo de publicación
    const [pubTipo] = await connection.query(
        "SELECT p.tipo FROM proyecto p JOIN publicacion_proyecto pp ON p.id_proyecto = pp.id_proyecto WHERE pp.id_publicacion = ?",
        [id_publicacion]
    );

    if (!pubTipo || pubTipo.length === 0) {
         await connection.rollback();
         return res.status(404).json({ error: "Publicación no encontrada" });
    }

    // 2. Comprobar el límite
    const tipo_accion_postular = (pubTipo[0].tipo === 'proyecto') ? 'postulacion_proyecto' : 'postulacion_tarea';
    // (Usamos id_usuario, no id_freelancer, para el check)
    const puedePostular = await checkUsageLimit(id_usuario, tipo_accion_postular, connection); 

    if (!puedePostular) {
        await connection.rollback();
        return res.status(403).json({ message: 'Has alcanzado el límite de postulaciones para tu plan.' });
    }
    // ✅ ===== FIN DEL GUARDIÁN =====


    // Verificar que no haya postulado antes
    const [existente] = await connection.query(
      "SELECT id_postulacion FROM postulacion WHERE id_publicacion = ? AND id_freelancer = ?",
      [id_publicacion, id_freelancer]
    );

    if (existente && existente.length > 0) {
      await connection.rollback();
      return res.status(409).json({ error: "Ya has postulado a este proyecto" });
    }

    // Insertar postulación
    const [result] = await connection.query(
      `INSERT INTO postulacion (id_publicacion, id_freelancer, estado_postulacion) 
       VALUES (?, ?, 'pendiente')`,
      [id_publicacion, id_freelancer]
    );

    const id_postulacion = result.insertId;

    // (Lógica de Notificaciones - OK)
    const [proyecto] = await connection.query(
      `SELECT p.titulo as nombre_proyecto, p.id_empresa, e.id_usuario as id_usuario_empresa
       FROM publicacion_proyecto pp
       INNER JOIN proyecto p ON pp.id_proyecto = p.id_proyecto
       INNER JOIN empresa e ON p.id_empresa = e.id_empresa
       WHERE pp.id_publicacion = ?`,
      [id_publicacion]
    );

    if (proyecto && proyecto.length > 0) {
      const nombreProyecto = proyecto[0].nombre_proyecto;
      const idUsuarioEmpresa = proyecto[0].id_usuario_empresa;

      const [freelancerData] = await connection.query(
        `SELECT CONCAT(ap.nombres, ' ', ap.apellidos) as nombre_completo
         FROM antecedentes_personales ap
         WHERE ap.id_freelancer = ?`,
        [id_freelancer]
      );

      const nombreFreelancer = freelancerData[0]?.nombre_completo || "Freelancer";

      await notificarPostulacionRecibida(
        id_usuario,
        nombreProyecto,
        id_publicacion,
        connection
      );

      await notificarNuevaPostulacion(
        idUsuarioEmpresa,
        nombreFreelancer,
        nombreProyecto,
        id_postulacion,
        connection
      );
    }

    await connection.commit();
    res.status(201).json({ 
      message: "Postulación creada exitosamente",
      id_postulacion 
    });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error al crear postulación:", error);
    // Devuelve el mensaje de error del guardián si existe
    res.status(error.message.includes("límite") ? 403 : 500).json({ error: error.message || "Error al crear la postulación" });
  } finally {
    if (connection) connection.release();
  }
};

// ✅ NUEVA FUNCIÓN: Aceptar postulación
const aceptarPostulacion = async (req, res) => {
  const { id_postulacion } = req.params;
  
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Actualizar estado de la postulación
    await connection.query(
      "UPDATE postulacion SET estado_postulacion = 'aceptada' WHERE id_postulacion = ?",
      [id_postulacion]
    );

    // OBTENER DATOS PARA NOTIFICACIÓN
    const postulacionData = await getPostulacionData(id_postulacion);

    if (postulacionData) {
      // (Import corregido al inicio del archivo)
      await notificarPostulacionAceptada(
        postulacionData.id_usuario_freelancer,
        postulacionData.nombre_proyecto,
        postulacionData.id_publicacion,
        connection
      );
    }

    await connection.commit();
    res.json({ message: "Postulación aceptada exitosamente" });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error al aceptar postulación:", error);
    res.status(500).json({ error: "Error al aceptar la postulación" });
  } finally {
    if (connection) connection.release();
  }
};

// ✅ NUEVA FUNCIÓN: Rechazar postulación
const rechazarPostulacion = async (req, res) => {
  const { id_postulacion } = req.params;
  
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Actualizar estado de la postulación
    await connection.query(
      "UPDATE postulacion SET estado_postulacion = 'rechazada' WHERE id_postulacion = ?",
      [id_postulacion]
    );

    // OBTENER DATOS PARA NOTIFICACIÓN
    const postulacionData = await getPostulacionData(id_postulacion);

    if (postulacionData) {
      // (Import corregido al inicio del archivo)
      await notificarPostulacionRechazada(
        postulacionData.id_usuario_freelancer,
        postulacionData.nombre_proyecto,
        connection
      );
    }

    await connection.commit();
    res.json({ message: "Postulación rechazada" });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error al rechazar postulación:", error);
    res.status(500).json({ error: "Error al rechazar la postulación" });
  } finally {
    if (connection) connection.release();
  }
};

// Obtener postulaciones por ID de proyecto (YA EXISTENTE)
const getPostulationsByProjectId = async (req, res) => {
  const { id_proyecto } = req.params;

  try {
    const postulations = await postulationQueries.findPostulationsByProjectId(id_proyecto);
    
    const formattedPostulations = postulations.map(post => ({
      id_postulacion: post.id_postulacion,
      id_usuario: post.id_usuario,
      nombre: `${post.nombres || ''} ${post.apellidos || ''}`.trim() || 'Nombre no disponible',
      titulo_profesional: post.titulo_profesional || post.ultimo_cargo || 'Sin título especificado',
      biografia: post.ultima_empresa ? `Última experiencia en ${post.ultima_empresa}` : '',
      tarifa_hora: post.renta_esperada || 0,
      experiencia_anios: 0,
      correo: post.correo_contacto || '',
      telefono: post.telefono_contacto || '',
      fecha_postulacion: post.fecha_postulacion,
      estado_postulacion: post.estado_postulacion
    }));

    res.json(formattedPostulations);
  } catch (error) {
    console.error("Error al obtener postulaciones:", error);
    res.status(500).json({ 
      error: "Error al obtener postulaciones",
      mensaje: error.message 
    });
  }
};

// Obtener postulaciones por ID de publicación (YA EXISTENTE)
const getPostulationsByPublicationId = async (req, res) => {
  const { id_publicacion } = req.params;

  try {
    const postulations = await postulationQueries.findPostulationsByPublicationId(id_publicacion);
    
    const formattedPostulations = postulations.map(post => ({
      id_postulacion: post.id_postulacion,
      id_usuario: post.id_usuario,
      nombre: `${post.nombres || ''} ${post.apellidos || ''}`.trim() || 'Nombre no disponible',
      titulo_profesional: post.titulo_profesional || post.ultimo_cargo || 'Sin título especificado',
      biografia: post.ultima_empresa ? `Última experiencia en ${post.ultima_empresa}` : '',
      tarifa_hora: post.renta_esperada || 0,
      experiencia_anios: 0,
      correo: post.correo_contacto || '',
      telefono: post.telefono_contacto || '',
      fecha_postulacion: post.fecha_postulacion,
      estado_postulacion: post.estado_postulacion
    }));

    res.json(formattedPostulations);
  } catch (error) {
    console.error("Error al obtener postulaciones:", error);
    res.status(500).json({ 
      error: "Error al obtener postulaciones",
      mensaje: error.message 
    });
  }
};

module.exports = {
  getAllProjects,
  getProjectById,
  updateProject,
  createProject,
  deleteProject,
  getProjectsByUser,
  releaseProjectPayment,
  crearPostulacion,       
  aceptarPostulacion,       
  rechazarPostulacion,  
  getPostulationsByProjectId,
  getPostulationsByPublicationId
};