import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'querygen',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
});

(async () => {
  try {
    await pool.query('SELECT 1');
    console.log('DB Connection established');
  } catch (err) {
    console.error("DB connection failed:", err);
  }
})();

export default pool;