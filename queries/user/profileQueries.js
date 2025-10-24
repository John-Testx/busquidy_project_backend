const pool = require("../../db");

/**
 * Queries relacionadas con perfiles de empresa y freelancer
 */

// Insertar perfil de empresa
const insertEmpresaProfile = async (id_usuario) => {
  const [result] = await pool.query(
    "INSERT INTO empresa (id_usuario) VALUES (?)",
    [id_usuario]
  );
  return result.insertId;
};

// Insertar perfil de freelancer
const insertFreelancerProfile = async (id_usuario) => {
  const [result] = await pool.query(
    "INSERT INTO freelancer (id_usuario) VALUES (?)",
    [id_usuario]
  );
  return result.insertId;
};

// Buscar empresa por id_usuario
const findEmpresaByUserId = async (id_usuario) => {
  const [rows] = await pool.query(
    "SELECT * FROM empresa WHERE id_usuario = ?",
    [id_usuario]
  );
  return rows.length > 0 ? rows[0] : null;
};

// Buscar freelancer por id_usuario
const findFreelancerByUserId = async (id_usuario) => {
  const [rows] = await pool.query(
    "SELECT * FROM freelancer WHERE id_usuario = ?",
    [id_usuario]
  );
  return rows.length > 0 ? rows[0] : null;
};

module.exports = {
  insertEmpresaProfile,
  insertFreelancerProfile,
  findEmpresaByUserId,
  findFreelancerByUserId
};