require("dotenv").config();
const mysql = require("mysql2/promise");
const fs = require('fs');
const path = require('path'); // Import 'path' for a more robust file path
// THIS IS THE CORRECT IMPORT
const { Connector } = require("@google-cloud/cloud-sql-connector");

const pool = (() => {
  const dbEnv = process.env.DB_ENV || 'local';
  console.log(`Inicializando conexión a DB para ambiente: ${dbEnv}`);

  let config;

  if (dbEnv === 'cloud') {
    // --- CONFIG CLOUD (IP Pública + SSL) ---
    // Este es el método que usa Workbench.
    
    // Asume que 'server-ca.pem' está en el MISMO directorio que este db.js
    const certPath = path.join(__dirname, 'server-ca.pem');
    if (!fs.existsSync(certPath)) {
      console.error("ERROR FATAL: Certificado SSL 'server-ca.pem' no encontrado.");
      console.error(`Se esperaba en: ${certPath}`);
      // Asegúrate de que el archivo server-ca.pem esté al lado de db.js
      throw new Error("Falta server-ca.pem para conexión cloud");
    }
    console.log(`Cargando certificado SSL desde: ${certPath}`);

    config = {
      host: process.env.DB_HOST_CLOUD,
      user: process.env.DB_USER_CLOUD,
      password: process.env.DB_PASSWORD_CLOUD, // La contraseña STRING
      database: process.env.DB_NAME,
      port: 3306,
      ssl: {
        ca: fs.readFileSync(certPath)
      }
    };
    
  } else {
    // --- CONFIG LOCAL ---
    console.log("Usando conexión a DB Local...");
    config = {
      host: process.env.DB_HOST_LOCAL,
      user: process.env.DB_USER_LOCAL,
      password: process.env.DB_PASSWORD_LOCAL,
      database: process.env.DB_NAME,
      port: 3306
    };
  }

  // --- CREAR EL POOL ---
  try {
    const dbPool = mysql.createPool({
      ...config, // Aplica la config elegida
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
    
    console.log("✅ Pool de conexión a DB creado exitosamente.");
    return dbPool; // Retorna el OBJETO pool real
    
  } catch (error) {
    console.error("❌ Falló al crear el pool de conexión:", error);
    throw error;
  }
})(); // Los () aquí ejecutan la función inmediatamente

// Esto exporta el objeto pool, no una promesa.
module.exports = pool;