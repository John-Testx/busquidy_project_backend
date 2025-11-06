const pool = require("../db");
const { getUserById } = require("../queries/user/userQueries");

/**
 * Obtiene el plan activo (de pago o gratuito) de un usuario.
 */
const getActivePlan = async (id_usuario, tipo_usuario) => {
    let connection;
    try {
        connection = await pool.getConnection();
        
        // 1. Buscar una suscripción de pago activa
        const [subRows] = await connection.query(
            `SELECT p.* FROM suscripcion s
             JOIN plan p ON s.id_plan = p.id_plan
             WHERE s.id_usuario = ? AND s.estado = 'activa' AND s.fecha_fin >= CURDATE()`,
            [id_usuario]
        );

        if (subRows && subRows.length > 0) {
            return subRows[0]; // Retorna el plan de pago
        }

        // 2. Si no hay, buscar el plan gratuito correspondiente
        const [freePlanRows] = await connection.query(
            `SELECT * FROM plan WHERE tipo_usuario = ? AND es_plan_gratuito = TRUE`,
            [tipo_usuario]
        );

        if (freePlanRows && freePlanRows.length > 0) {
            return freePlanRows[0]; // Retorna el plan gratuito
        }

        return null; // No se encontró ningún plan
    } catch (error) {
        console.error("Error en getActivePlan:", error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Cuenta el uso actual de una acción específica para el mes corriente.
 */
const getCurrentUsage = async (id_usuario, tipo_accion) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const mesActual = new Date().getMonth() + 1;
        const anoActual = new Date().getFullYear();
        let query = '';
        let params = [id_usuario, mesActual, anoActual];

        switch (tipo_accion) {
            case 'publicacion_proyecto':
                query = `SELECT COUNT(*) AS total 
                         FROM proyecto p 
                         JOIN empresa e ON p.id_empresa = e.id_empresa 
                         JOIN publicacion_proyecto pp ON p.id_proyecto = pp.id_proyecto
                         WHERE e.id_usuario = ? AND p.tipo = 'proyecto' 
                           AND MONTH(pp.fecha_creacion) = ? AND YEAR(pp.fecha_creacion) = ?`;
                break;
            case 'publicacion_tarea':
                query = `SELECT COUNT(*) AS total 
                         FROM proyecto p 
                         JOIN empresa e ON p.id_empresa = e.id_empresa 
                         JOIN publicacion_proyecto pp ON p.id_proyecto = pp.id_proyecto
                         WHERE e.id_usuario = ? AND p.tipo = 'tarea' 
                           AND MONTH(pp.fecha_creacion) = ? AND YEAR(pp.fecha_creacion) = ?`;
                break;
            case 'postulacion_proyecto':
                query = `SELECT COUNT(*) AS total 
                         FROM postulacion post
                         JOIN freelancer f ON post.id_freelancer = f.id_freelancer
                         JOIN publicacion_proyecto pp ON post.id_publicacion = pp.id_publicacion
                         JOIN proyecto p ON pp.id_proyecto = p.id_proyecto
                         WHERE f.id_usuario = ? AND p.tipo = 'proyecto'
                           AND MONTH(post.fecha_postulacion) = ? AND YEAR(post.fecha_postulacion) = ?`;
                break;
            case 'postulacion_tarea':
                query = `SELECT COUNT(*) AS total 
                         FROM postulacion post
                         JOIN freelancer f ON post.id_freelancer = f.id_freelancer
                         JOIN publicacion_proyecto pp ON post.id_publicacion = pp.id_publicacion
                         JOIN proyecto p ON pp.id_proyecto = p.id_proyecto
                         WHERE f.id_usuario = ? AND p.tipo = 'tarea'
                           AND MONTH(post.fecha_postulacion) = ? AND YEAR(post.fecha_postulacion) = ?`;
                break;
            default:
                return 0;
        }

        const [rows] = await connection.query(query, params);
        return rows[0].total;

    } catch (error) {
        console.error(`Error en getCurrentUsage para ${tipo_accion}:`, error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Verifica si un usuario puede realizar una acción según su plan.
 * Se puede pasar una 'connection' si es parte de una transacción.
 */
const checkUsageLimit = async (id_usuario, tipo_accion, connection) => {
    const usePool = !connection; // Decide si usar pool o la conexión existente
    const db = usePool ? pool : connection;

    try {
        const [user] = await db.query("SELECT tipo_usuario FROM usuario WHERE id_usuario = ?", [id_usuario]);
        if (!user || user.length === 0) throw new Error("Usuario no encontrado");

        const plan = await getActivePlan(id_usuario, user[0].tipo_usuario);
        if (!plan) throw new Error("No se encontró un plan activo para el usuario.");

        let limite;
        switch (tipo_accion) {
            case 'publicacion_proyecto':
            case 'publicacion_tarea':
                limite = plan.limite_publicacion_proyectos;
                break;
            case 'postulacion_proyecto':
                limite = plan.limite_postulacion_proyectos;
                break;
            case 'postulacion_tarea':
                limite = plan.limite_postulacion_tareas;
                break;
            default:
                return false; // Acción desconocida
        }

        if (limite === null) {
            return true; // Límite ilimitado
        }

        const usoActual = await getCurrentUsage(id_usuario, tipo_accion);
        
        return usoActual < limite;

    } catch (error) {
        console.error("Error en checkUsageLimit:", error);
        throw error; // Propaga el error para que el controlador lo maneje
    }
};

/**
 * Obtiene los límites y el uso actual para el dashboard del usuario.
 */
const getUsageDetails = async (id_usuario) => {
    try {
        const [user] = await pool.query("SELECT tipo_usuario FROM usuario WHERE id_usuario = ?", [id_usuario]);
        if (!user || user.length === 0) throw new Error("Usuario no encontrado");
        
        const tipo_usuario = user[0].tipo_usuario;
        const plan = await getActivePlan(id_usuario, tipo_usuario);
        if (!plan) throw new Error("No se encontró un plan activo.");

        let usageDetails = {
            plan_nombre: plan.nombre,
            limites: {},
            uso: {}
        };

        if (tipo_usuario === 'freelancer') {
            usageDetails.limites.postulacion_proyectos = plan.limite_postulacion_proyectos;
            usageDetails.limites.postulacion_tareas = plan.limite_postulacion_tareas;
            usageDetails.uso.postulacion_proyectos = await getCurrentUsage(id_usuario, 'postulacion_proyecto');
            usageDetails.uso.postulacion_tareas = await getCurrentUsage(id_usuario, 'postulacion_tarea');
        
        } else if (tipo_usuario === 'empresa_juridico') {
            usageDetails.limites.publicacion_proyectos = plan.limite_publicacion_proyectos;
            usageDetails.uso.publicacion_proyectos = await getCurrentUsage(id_usuario, 'publicacion_proyecto');
        
        } else if (tipo_usuario === 'empresa_natural') {
            // La empresa natural usa la misma columna de límite pero para 'tareas'
            usageDetails.limites.publicacion_tareas = plan.limite_publicacion_proyectos;
            usageDetails.uso.publicacion_tareas = await getCurrentUsage(id_usuario, 'publicacion_tarea');
        }

        return usageDetails;
    } catch (error) {
        console.error("Error en getUsageDetails:", error);
        throw error;
    }
};


module.exports = {
    checkUsageLimit,
    getUsageDetails,
    getActivePlan
};
