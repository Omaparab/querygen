"use server";

import pool from "./db";
import { auth } from "@/auth";
import { getUserRole, type UserRole } from "./rbac";

export interface UserRecord {
  id: number;
  email: string;
  role: UserRole;
}

export interface ExecutionLogRecord {
  log_id: number;
  email: string;
  sql_text: string;
  query_type: string;
  exec_status: string;
  error_msg: string | null;
  rows_affected: number | null;
  executed_at: string;
}

/** Asserts that the current user is an admin. Throws if not. */
async function requireAdmin(): Promise<void> {
  const session = await auth();
  if (!session?.user?.email) throw new Error("Unauthorized");

  const userInfo = await getUserRole();
  if (!userInfo || userInfo.role !== "admin") {
    throw new Error("Forbidden: Admin access required.");
  }
}

/** Returns all users with their roles (admin only) */
export async function listUsers(): Promise<{
  success: boolean;
  users?: UserRecord[];
  error?: string;
}> {
  try {
    await requireAdmin();
    const res = await pool.query(
      "SELECT id, email, role FROM users ORDER BY id ASC"
    );
    return { success: true, users: res.rows as UserRecord[] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/** Updates a user's role (admin only) */
export async function updateUserRole(
  userId: number,
  newRole: UserRole
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();

    const validRoles: UserRole[] = ["admin", "auditor_read", "auditor_write", "viewer"];
    if (!validRoles.includes(newRole)) {
      throw new Error("Invalid role specified.");
    }

    const res = await pool.query(
      "UPDATE users SET role = $1 WHERE id = $2 RETURNING id",
      [newRole, userId]
    );

    if (res.rowCount === 0) throw new Error("User not found.");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/** Returns recent execution logs (admin only) */
export async function listExecutionLogs(limit = 50): Promise<{
  success: boolean;
  logs?: ExecutionLogRecord[];
  error?: string;
}> {
  try {
    await requireAdmin();
    const res = await pool.query(
      `SELECT el.log_id, u.email, el.sql_text, el.query_type,
              el.exec_status, el.error_msg, el.rows_affected, el.executed_at
       FROM execution_logs el
       JOIN users u ON u.id = el.user_id
       ORDER BY el.executed_at DESC
       LIMIT $1`,
      [limit]
    );
    return { success: true, logs: res.rows as ExecutionLogRecord[] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
