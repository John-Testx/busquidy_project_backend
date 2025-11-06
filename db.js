require("dotenv").config();
const mysql = require("mysql2/promise");
const { Connector } = require("@google-cloud/cloud-sql-connector");

/**
 * Esta función se encarga SÓLO de la conexión CLOUD
 */
const connectWithConnector = async () => {
  console.log("-> Conectando vía Cloud SQL Connector (IAM)...");
  const connector = new Connector();
  const clientOpts = await connector.getOptions({
    instanceConnectionName: process.env.DB_INSTANCE_CONNECTION_NAME,
    ipType: 'PUBLIC',
    // authType: "IAM",
  });

  const user = process.env.DB_USER_CLOUD;
  const password = process.env.DB_PASSWORD_CLOUD;
  const database = process.env.DB_NAME;

  console.log("DB INFO: ", {
    user: user,
    database: database,
    password: password
  });

  const dbConfig = {
    ...clientOpts,
    user: user,
    password: password,
    database: process.env.DB_NAME,
  };

  // Crear y devolver el pool de CLOUD
  return mysql.createPool({
    ...dbConfig,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
};

/**
 * Esta función se encarga SÓLO de la conexión LOCAL
 */
const connectLocal = () => {
  console.log("-> Conectando a DB Local...");
  const dbConfig = {
    host: process.env.DB_HOST_LOCAL,
    user: process.env.DB_USER_LOCAL,
    password: process.env.DB_PASSWORD_LOCAL,
    database: process.env.DB_NAME,
    port: 3306
  };
  
  // Crear y devolver el pool LOCAL
  return mysql.createPool({
    ...dbConfig,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
};


// 1. Objeto 'db' que se exporta
const db = {
  pool: null, // El pool real vivirá aquí

  /**
   * 2. Función de INICIALIZACIÓN
   */
  initialize: async () => {
    if (db.pool) return; // No inicializar dos veces

    const dbEnv = process.env.DB_ENV || 'local';
    console.log(`Inicializando conexión a DB para ambiente: ${dbEnv}`);

    try {
      if (dbEnv === 'cloud') {
        // --- CLOUD ---
        // Espera a que la conexión cloud se complete y asigna el pool
        db.pool = await connectWithConnector();
      
      } else {
        // --- LOCAL ---
        // Crea la conexión local (es síncrona) y asigna el pool
        db.pool = connectLocal(); 
      }
      
      // Este log ahora es correcto y se refiere al pool que acabamos de crear
      console.log("✅ Pool de conexión a DB creado exitosamente.");

    } catch (error) {
      console.error("❌ Falló al crear el pool de conexión:", error);
      throw error; // Lanza el error para que 'startServer' falle
    }
  },

  /**
   * 3. Funciones "Proxy" (sin cambios)
   */
  query: (...args) => {
    if (!db.pool) {
      throw new Error("Pool no inicializado. Asegúrate de llamar a 'await db.initialize()' en tu server.js");
    }
    return db.pool.query(...args);
  },
  
  getConnection: (...args) => {
    if (!db.pool) {
      throw new Error("Pool no inicializado. Asegúrate de llamar a 'await db.initialize()' en tu server.js");
    }
    return db.pool.getConnection(...args);
  }
};

// 4. Exportar el objeto 'db'
module.exports = db;