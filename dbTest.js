require("dotenv").config();
const pool = require("./db");
const fs = require("fs");
const path = require("path");

/**
 * Verificar conexión a la base de datos
 */
async function testDbConnection() {
  console.log("\n🔍 Verificando conexión a la base de datos...");
  console.log("  - DB_HOST:", process.env.DB_HOST);
  console.log("  - DB_USER:", process.env.DB_USER);
  console.log("  - DB_NAME:", process.env.DB_NAME);
  console.log("  - DB_PORT:", process.env.DB_PORT || 3306);

  try {
    // ✅ Usar pool directamente (no pool.pool)
    const [rows] = await pool.query("SELECT 1 + 1 AS resultado");
    console.log("✅ Conexión exitosa a la base de datos");
    console.log("  - Resultado de prueba:", rows[0].resultado);
    return true;
  } catch (error) {
    console.error("❌ Error al conectar a la base de datos:", error.message);
    console.error("  - Código de error:", error.code);
    return false;
  }
}

/**
 * Asegurar que existan los directorios necesarios para uploads
 */
function ensureUploadDirectories() {
  console.log("\n📁 Verificando directorios de uploads...");

  const directories = [
    path.join(__dirname, "..", process.env.UPLOADS_DIR || "uploads/cvs"),
    path.join(__dirname, "..", "uploads/images"),
    path.join(__dirname, "..", "uploads/documents"),
  ];

  directories.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`  ✅ Directorio creado: ${dir}`);
    } else {
      console.log(`  ✓ El directorio ya existe: ${dir}`);
    }
  });
}

/**
 * Verificar estructura de la base de datos (opcional)
 */
async function verifyDatabaseStructure() {
  console.log("\n🔍 Verificando estructura de la base de datos...");
  
  try {
    const tables = [
      "usuario",
      "empresa",
      "freelancer",
      "proyecto",
      "pago",
      "suscripcion",
      "plan",
    ];

    for (const table of tables) {
      const [rows] = await pool.query(
        `SELECT COUNT(*) as count FROM information_schema.tables 
         WHERE table_schema = ? AND table_name = ?`,
        [process.env.DB_NAME, table]
      );

      if (rows[0].count > 0) {
        console.log(`  ✅ Tabla '${table}' existe`);
      } else {
        console.log(`  ⚠️  Tabla '${table}' NO existe`);
      }
    }
  } catch (error) {
    console.error("❌ Error al verificar estructura:", error.message);
  }
}

module.exports = {
  testDbConnection,
  ensureUploadDirectories,
  verifyDatabaseStructure,
};