import mysql from 'mysql2/promise';
import { parseConnectionUrl } from './db-utils';

const DATABASE_URL = 'mysql://qg_funsheepby:9465d000d3589b0d24eb5dd7d6214e49d5838610@s-etb4.h.filess.io:3306/qg_funsheepby';
const config = parseConnectionUrl(DATABASE_URL);

/**
 * Custom pool wrapper that ensures connections are closed after every query.
 * This is necessary because the target database has a strict max connection limit of 5.
 */
const pool = {
  async query(sql: string, params?: any[]) {
    // Create a new connection for each query
    const connection = await mysql.createConnection(config);
    try {
      // Execute the query
      // Note: we use connection.query which returns [rows, fields] just like pool.query
      return await connection.query(sql, params);
    } finally {
      // Ensure the connection is closed and returned to the system
      await connection.end();
    }
  }
};

export default pool;