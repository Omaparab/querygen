"use server";

import mysql from "mysql2/promise";
import pool from "./db";
import { auth } from "@/auth";
import { parseConnectionUrl } from "./db-utils";

const DEFAULT_DATABASE_URL = "mysql://qg_funsheepby:9465d000d3589b0d24eb5dd7d6214e49d5838610@s-etb4.h.filess.io:3306/qg_funsheepby";

/**
 * Get the user's saved database connection URL from url_history,
 * falling back to the default MySQL URL.
 */
export async function getConnectionUrl(): Promise<string> {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return DEFAULT_DATABASE_URL;
    }

    const [userRows] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [session.user.email]
    ) as [any[], any];

    const userId = userRows[0]?.id;

    if (!userId) {
      return DEFAULT_DATABASE_URL;
    }

    const [urlRows] = await pool.query(
      "SELECT database_url FROM url_history WHERE user_id = ? ORDER BY id DESC LIMIT 1",
      [userId]
    ) as [any[], any];

    return urlRows[0]?.database_url || DEFAULT_DATABASE_URL;
  } catch (error) {
    console.error("Error fetching connection URL:", error);
    return DEFAULT_DATABASE_URL;
  }
}

export interface TableInfo {
  tableName: string;
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
}

/**
 * Connect to the user's configured database and fetch all tables
 * along with their data (limited to 100 rows each).
 */
export async function fetchTables(): Promise<{
  success: boolean;
  tables?: TableInfo[];
  error?: string;
  databaseUrl?: string;
}> {
  let userPool: mysql.Pool | null = null;

  try {
    const connectionUrl = await getConnectionUrl();
    const config = parseConnectionUrl(connectionUrl);

    userPool = mysql.createPool({
      ...config,
      waitForConnections: true,
      connectionLimit: 2,
    });

    // Test the connection
    await userPool.query("SELECT 1");

    // Get all table names in the target database
    const [tablesRows] = await userPool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = ? AND table_type = 'BASE TABLE'
       ORDER BY table_name`,
      [config.database]
    ) as [any[], any];

    const tables: TableInfo[] = [];

    for (const row of tablesRows) {
      const tableName = row.table_name ?? row.TABLE_NAME;

      // Fetch row count
      const [countRows] = await userPool.query(
        `SELECT COUNT(*) AS count FROM \`${tableName}\``
      ) as [any[], any];
      const rowCount = parseInt(countRows[0].count, 10);

      // Fetch first 100 rows
      const [dataRows, fields] = await userPool.query(
        `SELECT * FROM \`${tableName}\` LIMIT 100`
      ) as [any[], any];

      const columns = (fields as any[]).map((f: any) => f.name);

      tables.push({
        tableName,
        columns,
        rows: dataRows,
        rowCount,
      });
    }

    return { success: true, tables, databaseUrl: connectionUrl };
  } catch (error: any) {
    console.error("❌ fetchTables Error:", error.message);
    return {
      success: false,
      error: error.message || "Failed to connect to database",
    };
  } finally {
    if (userPool) {
      await userPool.end();
    }
  }
}

/**
 * Test a database connection URL without fetching any data.
 */
export async function testConnection(
  url: string
): Promise<{ success: boolean; error?: string }> {
  let testPool: mysql.Pool | null = null;
  try {
    const config = parseConnectionUrl(url);
    testPool = mysql.createPool({
      ...config,
      waitForConnections: true,
      connectionLimit: 2,
    });
    await testPool.query("SELECT 1");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Connection failed" };
  } finally {
    if (testPool) {
      await testPool.end();
    }
  }
}

/**
 * Map MySQL column data types to the simplified Spider schema types.
 * Spider uses: int, text, bool, real, time, others default to text.
 */
function toSpiderType(mysqlType: string): string {
  const t = mysqlType.toLowerCase();
  if (/^(int|bigint|smallint|tinyint|mediumint)/.test(t)) return "int";
  if (/^(float|double|decimal|numeric|real)/.test(t)) return "real";
  if (/^(bool|boolean|bit)/.test(t)) return "bool";
  if (/^(date|datetime|timestamp|time|year)/.test(t)) return "time";
  return "text";
}

/**
 * Fetch the schema from the user's connected database and serialise it
 * in the Spider / T5-LM-Large-text2sql format expected by the model:
 *
 *   "table" "col1" type , "col2" type , ...
 *   foreign_key: "fk_col" type from "ref_table" "ref_col" ,
 *   primary key: "pk_col" [SEP] ...
 */
export async function getDynamicSchema(): Promise<{
  success: boolean;
  schema?: string;
  error?: string;
}> {
  let userPool: mysql.Pool | null = null;

  try {
    const connectionUrl = await getConnectionUrl();
    const config = parseConnectionUrl(connectionUrl);

    userPool = mysql.createPool({
      ...config,
      waitForConnections: true,
      connectionLimit: 2,
    });

    const db = config.database;

    // ── 1. Columns with types ──────────────────────────────────────────────
    const [colRows] = await userPool.query(
      `SELECT table_name, column_name, data_type
       FROM information_schema.columns
       WHERE table_schema = ?
       ORDER BY table_name, ordinal_position`,
      [db]
    ) as [any[], any];

    if ((colRows as any[]).length === 0) {
      return { success: true, schema: "" };
    }

    // ── 2. Primary keys ────────────────────────────────────────────────────
    const [pkRows] = await userPool.query(
      `SELECT table_name, column_name
       FROM information_schema.key_column_usage
       WHERE table_schema = ?
         AND constraint_name = 'PRIMARY'
       ORDER BY table_name, ordinal_position`,
      [db]
    ) as [any[], any];

    // Map: tableName → pkColumn[]
    const pkMap: Record<string, string[]> = {};
    for (const r of pkRows as any[]) {
      const t = r.table_name ?? r.TABLE_NAME;
      const c = r.column_name ?? r.COLUMN_NAME;
      if (!pkMap[t]) pkMap[t] = [];
      pkMap[t].push(c);
    }

    // ── 3. Foreign keys ────────────────────────────────────────────────────
    const [fkRows] = await userPool.query(
      `SELECT kcu.table_name, kcu.column_name,
              kcu.referenced_table_name, kcu.referenced_column_name,
              cols.data_type
       FROM information_schema.key_column_usage kcu
       JOIN information_schema.columns cols
         ON cols.table_schema = kcu.table_schema
        AND cols.table_name   = kcu.table_name
        AND cols.column_name  = kcu.column_name
       WHERE kcu.table_schema = ?
         AND kcu.referenced_table_name IS NOT NULL
       ORDER BY kcu.table_name, kcu.ordinal_position`,
      [db]
    ) as [any[], any];

    // Map: tableName → FK descriptor[]
    type FKDesc = { col: string; dataType: string; refTable: string; refCol: string };
    const fkMap: Record<string, FKDesc[]> = {};
    for (const r of fkRows as any[]) {
      const t = r.table_name ?? r.TABLE_NAME;
      if (!fkMap[t]) fkMap[t] = [];
      fkMap[t].push({
        col: r.column_name ?? r.COLUMN_NAME,
        dataType: r.data_type ?? r.DATA_TYPE,
        refTable: r.referenced_table_name ?? r.REFERENCED_TABLE_NAME,
        refCol: r.referenced_column_name ?? r.REFERENCED_COLUMN_NAME,
      });
    }

    // ── 4. Build per-table column map ──────────────────────────────────────
    type ColDesc = { name: string; dataType: string };
    const tableMap: Record<string, ColDesc[]> = {};
    for (const r of colRows as any[]) {
      const t = r.table_name ?? r.TABLE_NAME;
      const c = r.column_name ?? r.COLUMN_NAME;
      const dt = r.data_type ?? r.DATA_TYPE;
      if (!tableMap[t]) tableMap[t] = [];
      tableMap[t].push({ name: c, dataType: dt });
    }

    // ── 5. Serialise each table ────────────────────────────────────────────
    const tableParts: string[] = Object.entries(tableMap).map(([table, cols]) => {
      // Column list
      const colPart = cols
        .map(c => `"${c.name}" ${toSpiderType(c.dataType)}`)
        .join(" , ");

      // Foreign-key clause
      const fks = fkMap[table] ?? [];
      const fkPart = fks.length === 0
        ? ""
        : fks
            .map(fk => `"${fk.col}" ${toSpiderType(fk.dataType)} from "${fk.refTable}" "${fk.refCol}"`)
            .join(" , ");

      // Primary-key clause
      const pks = pkMap[table] ?? [];
      const pkPart = pks.map(p => `"${p}"`).join(" ");

      return `"${table}" ${colPart} , foreign_key: ${fkPart} primary key: ${pkPart}`;
    });

    const schema = tableParts.join(" [SEP] ");

    return { success: true, schema };
  } catch (error: any) {
    console.error("❌ getDynamicSchema Error:", error.message);
    return {
      success: false,
      error: error.message || "Failed to fetch dynamic schema",
    };
  } finally {
    if (userPool) {
      await userPool.end();
    }
  }
}
