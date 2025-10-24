// Uses '?' for MySQL parameter binding
const getAvailabilityByFreelancerId = "SELECT * FROM disponibilidad_freelancer WHERE id_freelancer = ? ORDER BY dia_semana, hora_inicio";

// MySQL-compatible INSERT statement
const addAvailability = `
    INSERT INTO disponibilidad_freelancer (id_freelancer, dia_semana, hora_inicio, hora_fin)
    VALUES (?, ?, ?, ?);
`;

// A separate query to get the row we just inserted, since MySQL doesn't have RETURNING
const getAvailabilityById = "SELECT * FROM disponibilidad_freelancer WHERE id_disponibilidad = ?";

// MySQL-compatible DELETE statement
const deleteAvailability = "DELETE FROM disponibilidad_freelancer WHERE id_disponibilidad = ? AND id_freelancer = ?";


module.exports = {
    getAvailabilityByFreelancerId,
    addAvailability,
    deleteAvailability,
};