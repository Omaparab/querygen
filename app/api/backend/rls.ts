"use server";

import pool from "./db";
import { auth } from "@/auth";
import { getUserRole, type UserRole } from "./rbac";

export interface RowPolicy {
  policy_id: number;
  role: UserRole;
  table_name: string;
  filter_col: string;
  filter_val: string;
  created_at: string;
}

/** Admin guard */
async function requireAdmin(): Promise<void> {
  const info = await getUserRole();
  if (!info || info.role !== "admin") {
    throw new Error("Forbidden: Admin access required.");
  }
}

/** Fetch all row policies (admin only) */
export async function listRowPolicies(): Promise<{
  success: boolean;
  policies?: RowPolicy[];
  error?: string;
}> {
  try {
    await requireAdmin();
    const res = await pool.query(
      `SELECT policy_id, role, table_name, filter_col, filter_val, created_at
       FROM row_policies ORDER BY role, table_name`
    );
    return { success: true, policies: res.rows as RowPolicy[] };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/** Create a new row policy (admin only) */
export async function createRowPolicy(
  role: UserRole,
  tableName: string,
  filterCol: string,
  filterVal: string
): Promise<{ success: boolean; policy?: RowPolicy; error?: string }> {
  try {
    await requireAdmin();
    const info = await getUserRole();

    if (!tableName.trim() || !filterCol.trim() || !filterVal.trim()) {
      throw new Error("All fields are required.");
    }

    const res = await pool.query(
      `INSERT INTO row_policies (role, table_name, filter_col, filter_val, created_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (role, table_name, filter_col)
       DO UPDATE SET filter_val = EXCLUDED.filter_val
       RETURNING *`,
      [role, tableName.trim(), filterCol.trim(), filterVal.trim(), info!.userId]
    );
    return { success: true, policy: res.rows[0] as RowPolicy };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/** Delete a row policy (admin only) */
export async function deleteRowPolicy(
  policyId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
    const res = await pool.query(
      "DELETE FROM row_policies WHERE policy_id = $1 RETURNING policy_id",
      [policyId]
    );
    if (res.rowCount === 0) throw new Error("Policy not found.");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Fetch policies for a given role from the DB.
 * Returns a map of tableName → { col, val }
 * Used internally by the query executor.
 */
export async function getPoliciesForRole(
  role: UserRole
): Promise<Map<string, { col: string; val: string }>> {
  const map = new Map<string, { col: string; val: string }>();
  if (role === "admin") return map; // admins are unrestricted

  try {
    const res = await pool.query(
      "SELECT table_name, filter_col, filter_val FROM row_policies WHERE role = $1",
      [role]
    );
    for (const row of res.rows) {
      map.set(row.table_name.toLowerCase(), {
        col: row.filter_col,
        val: row.filter_val,
      });
    }
  } catch (e) {
    console.error("getPoliciesForRole error:", e);
  }
  return map;
}


