const pool = require("../../db");
const { v4: uuidV4 } = require('uuid');

const scheduleCall = async (req, res) => {
    // El ID del usuario que agenda (de la empresa) se obtiene del token
    const id_usuario_empresa = req.user.id; 
    const { tipo_usuario } = req.user; // ✅ Obtenemos el tipo de usuario
    const { title, scheduled_at, id_postulacion } = req.body;

    if (!title || !scheduled_at || !id_postulacion) {
        return res.status(400).json({ message: 'El título, la fecha y el ID de la postulación son requeridos.' });
    }

    // ✅ ===== NUEVA VALIDACIÓN =====
    if (tipo_usuario !== 'empresa_juridico' && tipo_usuario !== 'empresa_natural') {
        return res.status(403).json({ message: 'Acción no autorizada. Solo las empresas pueden agendar entrevistas.' });
    }
    // ✅ ===== FIN DE VALIDACIÓN =====

    const roomId = `busquidy-call-${uuidV4()}`;

    try {
        // 1. Obtener id_empresa y id_freelancer desde la postulación
        const postulacionQuery = 'SELECT p.id_freelancer, proy.id_empresa FROM postulacion p JOIN publicacion_proyecto pp ON p.id_publicacion = pp.id_publicacion JOIN proyecto proy ON pp.id_proyecto = proy.id_proyecto WHERE p.id_postulacion = $1';
        const { rows: postRows } = await pool.query(postulacionQuery, [id_postulacion]);

        if (postRows.length === 0) {
            return res.status(404).json({ message: 'Postulación no encontrada.' });
        }
        
        const { id_freelancer, id_empresa } = postRows[0];

        // 2. Insertar en la nueva tabla 'entrevista'
        // (Asegúrate de que la tabla 'entrevista' exista en tu BD)
        const insertQuery = `
            INSERT INTO entrevista (id_postulacion, id_empresa, id_freelancer, titulo, room_id, fecha_agendada)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;
        const values = [id_postulacion, id_empresa, id_freelancer, title, roomId, scheduled_at];
        const { rows } = await pool.query(insertQuery, values);
        
        // Aquí podrías agregar lógica para notificar al freelancer
        
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error('Error al agendar la entrevista:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

const getScheduledCalls = async (req, res) => {
    // Obtener el ID y el tipo de usuario desde el token de autenticación
    const { id: userId, tipo_usuario } = req.user;

    try {
        let query;
        // Filtrar por tipo de usuario para devolver las entrevistas correspondientes
        
        // ✅ ===== CAMBIO AQUÍ =====
        if (tipo_usuario === 'empresa_juridico' || tipo_usuario === 'empresa_natural') {
        // ✅ ===== FIN DEL CAMBIO =====
            query = `SELECT e.*, f.nombres, f.apellidos FROM entrevista e JOIN antecedentes_personales f ON e.id_freelancer = f.id_freelancer WHERE e.id_empresa = (SELECT id_empresa FROM empresa WHERE id_usuario = $1) AND e.fecha_agendada >= NOW() ORDER BY e.fecha_agendada ASC;`;
        } else if (tipo_usuario === 'freelancer') {
            query = `SELECT e.*, emp.nombre_empresa FROM entrevista e JOIN empresa emp ON e.id_empresa = emp.id_empresa WHERE e.id_freelancer = (SELECT id_freelancer FROM freelancer WHERE id_usuario = $1) AND e.fecha_agendada >= NOW() ORDER BY e.fecha_agendada ASC;`;
        } else {
            return res.status(403).json({ message: 'Tipo de usuario no autorizado.' });
        }

        const { rows } = await pool.query(query, [userId]);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error al obtener las entrevistas:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

const getUpcomingInterviews = async (req, res) => {
    // Obtener el ID y el tipo de usuario desde el token de autenticación
    const { id: userId, tipo_usuario } = req.user;

    try {
        let query;
        let queryParams = [userId];

        // 1. Obtener los IDs de entidad (id_empresa o id_freelancer) basados en el ID de usuario
        let entityIdQuery = '';
        if (tipo_usuario === 'empresa_juridico' || tipo_usuario === 'empresa_natural') {
            entityIdQuery = 'SELECT id_empresa FROM empresa WHERE id_usuario = ?';
            
            // Si el usuario es una empresa, buscamos las entrevistas donde es el solicitante
            query = `
                SELECT 
                    e.*, 
                    u_free.correo as correo_freelancer,
                    CONCAT(ap.nombres, ' ', ap.apellidos) AS nombre_contraparte
                FROM 
                    entrevistas e
                JOIN 
                    usuario u_free ON e.id_usuario_freelancer = u_free.id_usuario
                JOIN
                    freelancer f ON u_free.id_usuario = f.id_usuario
                JOIN
                    antecedentes_personales ap ON f.id_freelancer = ap.id_freelancer
                WHERE 
                    e.id_usuario_empresa = ? AND e.estado = 'agendada'
                    AND e.fecha_hora_inicio >= NOW() 
                ORDER BY 
                    e.fecha_hora_inicio ASC;
            `;
        } else if (tipo_usuario === 'freelancer') {
            entityIdQuery = 'SELECT id_freelancer FROM freelancer WHERE id_usuario = ?';
            
            // Si el usuario es un freelancer, buscamos las entrevistas donde es el receptor
            query = `
                SELECT 
                    e.*, 
                    u_emp.correo as correo_empresa,
                    emp.nombre_empresa AS nombre_contraparte
                FROM 
                    entrevistas e
                JOIN 
                    usuario u_emp ON e.id_usuario_empresa = u_emp.id_usuario
                JOIN
                    empresa emp ON u_emp.id_usuario = emp.id_usuario
                WHERE 
                    e.id_usuario_freelancer = ? AND e.estado = 'agendada'
                    AND e.fecha_hora_inicio >= NOW() 
                ORDER BY 
                    e.fecha_hora_inicio ASC;
            `;
        } else {
            return res.status(403).json({ message: 'Tipo de usuario no autorizado.' });
        }

        // 2. Ejecutar la consulta principal de entrevistas
        const { rows } = await pool.query(query, queryParams);
        
        
        // El frontend espera el campo 'nombre_contraparte' y 'room_id'
        res.status(200).json(rows);

    } catch (error) {
        console.error('Error al obtener las próximas entrevistas:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};


module.exports = { 
    scheduleCall, 
    getUpcomingInterviews,
    getScheduledCalls 
};