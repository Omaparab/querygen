"use server";

import { Pool } from "pg";
import pool from "./db";
import { auth } from "@/auth";

const DEFAULT_DATABASE_URL =
    "postgresql://postgres:root@localhost:5432/Employee_Domain";

/**
 * Get the user's saved database connection URL from url_history,
 * falling back to the default Employee_Domain URL.
 */
export async function getConnectionUrl(): Promise<string> {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return DEFAULT_DATABASE_URL;
        }

        const userRes = await pool.query("SELECT id FROM users WHERE email = $1", [
            session.user.email,
        ]);
        const userId = userRes.rows[0]?.id;

        if (!userId) {
            return DEFAULT_DATABASE_URL;
        }

        const urlRes = await pool.query(
            "SELECT database_url FROM url_history WHERE user_id = $1 ORDER BY id DESC LIMIT 1",
            [userId]
        );

        return urlRes.rows[0]?.database_url || DEFAULT_DATABASE_URL;
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
 * from the public schema along with their data (limited to 100 rows each).
 */
export async function fetchTables(): Promise<{
    success: boolean;
    tables?: TableInfo[];
    error?: string;
    databaseUrl?: string;
}> {
    let userPool: Pool | null = null;

    try {
        const connectionUrl = await getConnectionUrl();

        // Create a temporary pool for the user's database
        userPool = new Pool({ connectionString: connectionUrl });

        // Test the connection
        await userPool.query("SELECT 1");

        // Get all table names from the public schema
        const tablesRes = await userPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

        const tables: TableInfo[] = [];

        for (const row of tablesRes.rows) {
            const tableName = row.table_name;

            // Fetch row count
            const countRes = await userPool.query(
                `SELECT COUNT(*) as count FROM "${tableName}"`
            );
            const rowCount = parseInt(countRes.rows[0].count, 10);

            // Fetch first 100 rows
            const dataRes = await userPool.query(
                `SELECT * FROM "${tableName}" LIMIT 100`
            );

            const columns =
                dataRes.fields.map((f: { name: string }) => f.name) || [];

            tables.push({
                tableName,
                columns,
                rows: dataRes.rows,
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
    let testPool: Pool | null = null;
    try {
        testPool = new Pool({ connectionString: url });
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
 * Fetch the schema details from the user's connected database
 * and format it as a string for the AI model.
 * Format: table_name(column1, column2), other_table(col1, col2)
 */
export async function getDynamicSchema(): Promise<{ success: boolean; schema?: string; error?: string }> {
    let userPool: Pool | null = null;

    try {
        const connectionUrl = await getConnectionUrl();
        userPool = new Pool({ connectionString: connectionUrl });

        // Get all tables and their columns in the public schema
        const schemaRes = await userPool.query(`
            SELECT table_name, column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            ORDER BY table_name, ordinal_position;
        `);

        if (schemaRes.rows.length === 0) {
            return { success: true, schema: "" };
        }

        // Group columns by table
        const tableSchema: Record<string, string[]> = {};

        for (const row of schemaRes.rows) {
            const table = row.table_name;
            const column = row.column_name;

            if (!tableSchema[table]) {
                tableSchema[table] = [];
            }
            tableSchema[table].push(column);
        }

        // Format to: table_name: col1, col2 | table2: col1
        const formattedSchemaParts = Object.entries(tableSchema).map(([tableName, columns]) => {
            return `${tableName}: ${columns.join(', ')}`;
        });

        const finalSchemaString = formattedSchemaParts.join(' | ');

        return { success: true, schema: finalSchemaString };
    } catch (error: any) {
        console.error("❌ getDynamicSchema Error:", error.message);
        return { success: false, error: error.message || "Failed to fetch dynamic schema" };
    } finally {
        if (userPool) {
            await userPool.end();
        }
    }
}
