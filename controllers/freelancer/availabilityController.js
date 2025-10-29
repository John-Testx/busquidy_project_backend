const pool = require('../../db');
const availabilityQueries = require('../../queries/freelancer/availabilityQueries');
const { findFreelancerByUserId } = require('../../queries/freelancer/profileQueries');

// Obtener la disponibilidad de un freelancer
const getAvailability = async (req, res) => {
    const { id_usuario } = req.user;
    console.log("iduser:", id_usuario);

    const freelancerResults = await findFreelancerByUserId(id_usuario);

    if (freelancerResults.length === 0) {
        return res.status(404).json({ message: "Perfil de freelancer no encontrado." });
    }
    const freelancerId = freelancerResults[0].id_freelancer;

    try {
        // pool.query con mysql2 devuelve [ [rows], [fields] ]
        const availability = await pool.query(availabilityQueries.getAvailabilityByFreelancerId, [freelancerId]);
        
        console.log("Schedule/Times (raw): ", availability);
        
        // **CORRECCIÓN APLICADA**
        // Enviamos el primer array, que contiene las filas (rows)
        res.status(200).json(availability[0]);

    } catch (error) {
        console.error('Error al obtener la disponibilidad:', error);
        res.status(500).json({ message: "Error interno del servidor." });
    }
};

// Añadir un nuevo bloque de disponibilidad
const addAvailability = async (req, res) => {
    const { id_usuario } = req.user;

    // Lógica para encontrar el freelancer está correcta
    const freelancerResults = await findFreelancerByUserId(id_usuario);
    if (freelancerResults.length === 0) {
        return res.status(404).json({ error: "Freelancer no encontrado" });
    }
    const freelancerId = freelancerResults[0].id_freelancer;
    
    const { dia_semana, hora_inicio, hora_fin } = req.body;

    // Validaciones básicas
    if (!freelancerId) {
        return res.status(403).json({ message: "No autorizado." });
    }
    if (!dia_semana || !hora_inicio || !hora_fin) {
        return res.status(400).json({ message: "Todos los campos son requeridos." });
    }

    try {
        // Un INSERT con mysql2 devuelve [ [OkPacket], [Fields] ]
        const newSlot = await pool.query(availabilityQueries.addAvailability, [freelancerId, dia_semana, hora_inicio, hora_fin]);
        
        // Obtenemos el ID del OkPacket
        const insertId = newSlot[0].insertId;

        // Devolvemos el objeto completo que el frontend necesita
        res.status(201).json({
            id_disponibilidad: insertId,
            id_freelancer: freelancerId,
            dia_semana: dia_semana,
            hora_inicio: hora_inicio,
            hora_fin: hora_fin
        });

    } catch (error) {
        // **CORRECCIÓN 3: CÓDIGO DE ERROR DE MYSQL**
        // '23505' es de PostgreSQL. 'ER_DUP_ENTRY' es de MySQL.
        if (error.code === 'ER_DUP_ENTRY') { 
            return res.status(409).json({ message: "Este bloque de horario ya existe." });
        }
        
        console.error('Error al añadir disponibilidad:', error);
        res.status(500).json({ message: "Error interno del servidor." });
    }
};

// Eliminar un bloque de disponibilidad
// Eliminar un bloque de disponibilidad
const deleteAvailability = async (req, res) => {
    
    // Obtener el ID de forma consistente
    const { id_usuario } = req.user;
    const { id_disponibilidad } = req.params; // ID del horario que se quiere borrar

    const freelancerResults = await findFreelancerByUserId(id_usuario);
    if (freelancerResults.length === 0) {
        return res.status(404).json({ error: "Freelancer no encontrado" });
    }
    const freelancerId = freelancerResults[0].id_freelancer;

    if (!freelancerId) {
        return res.status(403).json({ message: "No autorizado." });
    }

    try {
        // Un DELETE con mysql2 devuelve [ [OkPacket], [Fields] ]
        const result = await pool.query(availabilityQueries.deleteAvailability, [id_disponibilidad, freelancerId]);
        
        // Usar 'affectedRows' (de MySQL) en lugar de 'rowCount' (de PG)**
        if (result[0].affectedRows === 0) {
            // Esto significa que la consulta se ejecutó, pero no encontró
            // un horario con ESE id_disponibilidad Y ESE freelancerId
            return res.status(404).json({ message: "Bloque de horario no encontrado o no te pertenece." });
        }

        // Si affectedRows > 0, se eliminó
        res.status(200).json({ message: "Bloque de horario eliminado exitosamente." });

    } catch (error) {
        console.error('Error al eliminar disponibilidad:', error);
        res.status(500).json({ message: "Error interno del servidor." });
    }
};

module.exports = {
    getAvailability,
    addAvailability,
    deleteAvailability,
};