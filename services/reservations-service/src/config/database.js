const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000
});

async function connectWithRetry(maxRetries = 5) {
  let retries = maxRetries;
  while (retries) {
    try {
      const connection = await pool.getConnection();
      console.log(`[DB] Connected to MySQL at ${process.env.DB_HOST}`);
      connection.release();
      return true;
    } catch (err) {
      console.error(`[DB] Connection failed: ${err.message}. Retries left: ${retries}`);
      retries -= 1;
      if (retries) await new Promise(res => setTimeout(res, 5000));
    }
  }
  console.error('[DB] Failed to connect after multiple attempts');
  return false;
}

module.exports = { pool, connectWithRetry };
