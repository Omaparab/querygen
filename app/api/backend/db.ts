import { Pool } from 'pg';

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: 'root',
  port: 5432,
});

(async () => {
  try {
    console.log('DB Connection established');
    await pool.query('SELECT 1');
  } catch (err) {
    console.error("DB connection failed:", err);
  }
})();

export default pool;