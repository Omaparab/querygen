"use server";

import { Pool } from "pg";
import pool from "./db";
import { auth } from "@/auth";
import { getConnectionUrl } from "./database";

export type UserRole = "admin" | "auditor_read" | "auditor_write" | "viewer";

export interface RolePermissions {
  canExecute: boolean;
  canWrite: boolean;
  canAdmin: boolean;
}

const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin:         { canExecute: true,  canWrite: true,  canAdmin: true  },
  auditor_write: { canExecute: true,  canWrite: true,  canAdmin: false },
  auditor_read:  { canExecute: true,  canWrite: false, canAdmin: false },
  viewer:        { canExecute: false, canWrite: false,  canAdmin: false },
};

/** Returns the current authenticated user's role from DB */
export async function getUserRole(): Promise<{ role: UserRole; userId: number } | null> {
  try {
    const session = await auth();
    if (!session?.user?.email) return null;
    const res = await pool.query(
      "SELECT id, role FROM users WHERE email = $1",
      [session.user.email]
    );
    if (!res.rows[0]) return null;
    return { role: res.rows[0].role as UserRole, userId: res.rows[0].id };
  } catch {
    return null;
  }
}

/** Returns the current user's permission set */
export async function getPermissions(): Promise<RolePermissions & { role: UserRole }> {
  const result = await getUserRole();
  const role: UserRole = result?.role ?? "viewer";
  return { ...ROLE_PERMISSIONS[role], role };
}

/** Detects if a SQL statement is a write operation */
function isWriteQuery(sql: string): boolean {
  const trimmed = sql.trim().toUpperCase();
  return /^(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|REPLACE|MERGE|UPSERT)\b/.test(trimmed);
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  rowsAffected?: number;
}

export interface ExecuteResult {
  success: boolean;
  denied?: boolean;
  data?: QueryResult;
  error?: string;
}

/**
 * Core guarded query execution.
 * Enforces role-based permissions, logs every attempt.
 */
export async function executeQuery(sql: string): Promise<ExecuteResult> {
  let userPool: Pool | null = null;
  let userId: number | null = null;
  const queryType = isWriteQuery(sql) ? "WRITE" : "SELECT";

  try {
    const session = await auth();
    if (!session?.user?.email) {
      return { success: false, denied: true, error: "Unauthorized: Please sign in." };
    }

    const userInfo = await getUserRole();
    if (!userInfo) {
      return { success: false, denied: true, error: "User not found." };
    }

    userId = userInfo.userId;
    const perms = ROLE_PERMISSIONS[userInfo.role];

    // Permission check: can the user execute at all?
    if (!perms.canExecute) {
      await logExecution(userId, sql, queryType, "denied", "Insufficient permissions: viewer role cannot execute queries.", null);
      return {
        success: false,
        denied: true,
        error: `Access denied. Your role (${userInfo.role}) does not have query execution privileges.`,
      };
    }

    // Permission check: write operations for read-only roles
    if (queryType === "WRITE" && !perms.canWrite) {
      await logExecution(userId, sql, queryType, "denied", "Write access denied for auditor_read role.", null);
      return {
        success: false,
        denied: true,
        error: `Access denied. Your role (${userInfo.role}) can only execute SELECT queries. Write operations are not permitted.`,
      };
    }

    // Connect to user's configured database
    const connectionUrl = await getConnectionUrl();
    userPool = new Pool({ connectionString: connectionUrl });

    const result = await userPool.query(sql);

    const columns = result.fields?.map((f) => f.name) ?? [];
    const rows = result.rows ?? [];
    const rowsAffected = result.rowCount ?? 0;

    await logExecution(userId, sql, queryType, "success", null, rowsAffected);

    return {
      success: true,
      data: {
        columns,
        rows,
        rowCount: rows.length,
        rowsAffected,
      },
    };
  } catch (error: any) {
    console.error("❌ executeQuery Error:", error.message);
    if (userId) {
      await logExecution(userId, sql, queryType, "error", error.message, null);
    }
    return { success: false, error: error.message || "Query execution failed." };
  } finally {
    if (userPool) await userPool.end();
  }
}

/** Inserts a record into execution_logs */
async function logExecution(
  userId: number,
  sql: string,
  queryType: string,
  status: "success" | "denied" | "error",
  errorMsg: string | null,
  rowsAffected: number | null
) {
  try {
    await pool.query(
      `INSERT INTO execution_logs (user_id, sql_text, query_type, exec_status, error_msg, rows_affected)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, sql, queryType, status, errorMsg, rowsAffected]
    );
  } catch (e) {
    console.error("Failed to log execution:", e);
  }
}
