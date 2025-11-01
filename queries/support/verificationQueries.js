const db = require("../../db");

// Inserta un nuevo código, borrando los anteriores para ese email
const insertVerificationCode = async (email, codigo) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    // Borrar códigos viejos para este email
    await conn.query("DELETE FROM soporte_verificacion_codigos WHERE email = ?", [email]);
    // Insertar el nuevo código
    await conn.query(
      "INSERT INTO soporte_verificacion_codigos (email, codigo) VALUES (?, ?)",
      [email, codigo]
    );
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

// Busca un código válido (creado en los últimos 10 minutos)
const findValidCode = async (email, codigo) => {
  const [rows] = await db.query(
    `SELECT id FROM soporte_verificacion_codigos 
     WHERE email = ? AND codigo = ? AND fecha_creacion >= (NOW() - INTERVAL 10 MINUTE)`,
    [email, codigo]
  );
  return rows[0]; // Retorna el registro si es válido, sino undefined
};

// Elimina un código (para usar después de verificarlo)
const deleteCode = async (email, codigo) => {
    await db.query("DELETE FROM soporte_verificacion_codigos WHERE email = ? AND codigo = ?", [email, codigo]);
};

module.exports = {
  insertVerificationCode,
  findValidCode,
  deleteCode
};