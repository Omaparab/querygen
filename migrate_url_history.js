const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: 'root',
  port: 5432,
});

async function migrate() {
  try {
    // Check if the id column already exists
    const check = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'url_history' AND column_name = 'id'
    `);
    
    if (check.rows.length > 0) {
      console.log('✅ Column "id" already exists in url_history. No migration needed.');
    } else {
      // Drop the old primary key constraint (database_url was the PK)
      await pool.query(`ALTER TABLE url_history DROP CONSTRAINT IF EXISTS url_history_pkey`);
      
      // Add the id column as serial primary key
      await pool.query(`ALTER TABLE url_history ADD COLUMN id SERIAL PRIMARY KEY`);
      
      console.log('✅ Migration complete: Added "id" column to url_history table.');
    }
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
