const pool = require('../../db');
const availabilityQueries = require('../../queries/freelancer/availabilityQueries');
const { findFreelancerByUserId } = require('../../queries/freelancer/profileQueries');

// Obtener la disponibilidad de un freelancer
const getAvailability = async (req, res) => {
    // El id del freelancer se obtiene del token de autenticación
    const {id_usuario } = req.user;
    // console.log("req: ", req);
    // console.log("req params: ", req.params);
    console.log("iduser:",id_usuario);

    const freelancerResults = await findFreelancerByUserId ([id_usuario]);

    if (freelancerResults.length === 0) {
        return res.status(404).json({ message: "Perfil de freelancer no encontrado." });
    }
    const freelancerId = freelancerResults[0].id_freelancer;

    try {
        const availability = await pool.query(availabilityQueries.getAvailabilityByFreelancerId, [freelancerId]);
        console.log("Schedule/Times: ", availability)
        res.status(200).json(availability.rows);
    } catch (error) {
        console.error('Error al obtener la disponibilidad:', error);
        res.status(500).json({ message: "Error interno del servidor." });
    }
};

// Añadir un nuevo bloque de disponibilidad
const addAvailability = async (req, res) => {

    const {id_usuario } = req.params;
    console.log(req);
    
    const [freelancerResults] = await findFreelancerByUserId(id_usuario);

    if (freelancerResults.length === 0) {
      return res.status(404).json({ error: "Freelancer no encontrado" });
    }

    const freelancerId = freelancerResults[0].id_freelancer;
    console.log("Freelancer encontrado",freelancerResults);

    const { dia_semana, hora_inicio, hora_fin } = req.body;
    // console.log(req)
    if (!freelancerId) {
        return res.status(403).json({ message: "No autorizado." });
    }

    if (!dia_semana || !hora_inicio || !hora_fin) {
        return res.status(400).json({ message: "Todos los campos son requeridos." });
    }

    try {
        const newSlot = await pool.query(availabilityQueries.addAvailability, [freelancerId, dia_semana, hora_inicio, hora_fin]);
        res.status(201).json(newSlot.rows[0]);
    } catch (error) {
        // Manejo de error para horarios duplicados
        if (error.code === '23505') { // '23505' es el código de error para violaciones de unicidad en PostgreSQL
            return res.status(409).json({ message: "Este bloque de horario ya existe." });
        }
        console.error('Error al añadir disponibilidad:', error);
        res.status(500).json({ message: "Error interno del servidor." });
    }
};

// Eliminar un bloque de disponibilidad
const deleteAvailability = async (req, res) => {
    const freelancerId = req.user.freelancerId;
    const { id_disponibilidad } = req.params;

    if (!freelancerId) {
        return res.status(403).json({ message: "No autorizado." });
    }

    try {
        const result = await pool.query(availabilityQueries.deleteAvailability, [id_disponibilidad, freelancerId]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Bloque de horario no encontrado o no te pertenece." });
        }

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