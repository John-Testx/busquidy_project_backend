// backend/controllers/videoController.js

const db = require('../db');
const { v4: uuidV4 } = require('uuid');

exports.scheduleCall = async (req, res) => {
    // El ID del usuario que agenda (de la empresa) se obtiene del token
    const id_usuario_empresa = req.user.id; 
    const { title, scheduled_at, id_postulacion } = req.body;

    if (!title || !scheduled_at || !id_postulacion) {
        return res.status(400).json({ message: 'El título, la fecha y el ID de la postulación son requeridos.' });
    }

    const roomId = `busquidy-call-${uuidV4()}`;

    try {
        // 1. Obtener id_empresa y id_freelancer desde la postulación
        const postulacionQuery = 'SELECT p.id_freelancer, proy.id_empresa FROM postulacion p JOIN publicacion_proyecto pp ON p.id_publicacion = pp.id_publicacion JOIN proyecto proy ON pp.id_proyecto = proy.id_proyecto WHERE p.id_postulacion = $1';
        const { rows: postRows } = await db.query(postulacionQuery, [id_postulacion]);

        if (postRows.length === 0) {
            return res.status(404).json({ message: 'Postulación no encontrada.' });
        }
        
        const { id_freelancer, id_empresa } = postRows[0];

        // 2. Insertar en la nueva tabla 'entrevista'
        const insertQuery = `
            INSERT INTO entrevista (id_postulacion, id_empresa, id_freelancer, titulo, room_id, fecha_agendada)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;
        const values = [id_postulacion, id_empresa, id_freelancer, title, roomId, scheduled_at];
        const { rows } = await db.query(insertQuery, values);
        
        // Aquí podrías agregar lógica para notificar al freelancer
        
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error('Error al agendar la entrevista:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

exports.getScheduledCalls = async (req, res) => {
    // Obtener el ID y el tipo de usuario desde el token de autenticación
    const { id: userId, tipo_usuario } = req.user;

    try {
        let query;
        // Filtrar por tipo de usuario para devolver las entrevistas correspondientes
        if (tipo_usuario === 'empresa') {
            query = `SELECT e.*, f.nombres, f.apellidos FROM entrevista e JOIN antecedentes_personales f ON e.id_freelancer = f.id_freelancer WHERE e.id_empresa = (SELECT id_empresa FROM empresa WHERE id_usuario = $1) AND e.fecha_agendada >= NOW() ORDER BY e.fecha_agendada ASC;`;
        } else if (tipo_usuario === 'freelancer') {
            query = `SELECT e.*, emp.nombre_empresa FROM entrevista e JOIN empresa emp ON e.id_empresa = emp.id_empresa WHERE e.id_freelancer = (SELECT id_freelancer FROM freelancer WHERE id_usuario = $1) AND e.fecha_agendada >= NOW() ORDER BY e.fecha_agendada ASC;`;
        } else {
            return res.status(403).json({ message: 'Tipo de usuario no autorizado.' });
        }

        const { rows } = await db.query(query, [userId]);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error al obtener las entrevistas:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};