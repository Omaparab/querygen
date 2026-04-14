"use server";

import pool from "./db";
import { auth } from "@/auth";

export interface QueryItem {
  history_id: number;
  query_text: string;
  created_at: string;
}

export interface SessionGroup {
  session_id: string;
  started_at: string;
  queries: QueryItem[];
}

/**
 * Fetch all query history for the authenticated user, grouped by session.
 */
export async function fetchHistory(): Promise<{
  success: boolean;
  sessions?: SessionGroup[];
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      throw new Error("Unauthorized: Please sign in again.");
    }

    const [userRows] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [session.user.email]
    ) as [any[], any];
    const userId = userRows[0]?.id;

    if (!userId) {
      throw new Error("User not found in database.");
    }

    const [rows] = await pool.query(
      `SELECT qs.session_id,
              qs.started_at,
              nlh.history_id,
              nlh.query_text,
              nlh.created_at
       FROM   query_sessions qs
       JOIN   nl_query_history nlh
         ON   nlh.session_id = qs.session_id AND nlh.user_id = qs.user_id
       WHERE  qs.user_id = ?
       ORDER  BY qs.started_at DESC, nlh.created_at ASC`,
      [userId]
    ) as [any[], any];

    // Group rows by session_id
    const sessionMap = new Map<string, SessionGroup>();

    for (const row of rows) {
      const sid = row.session_id;

      if (!sessionMap.has(sid)) {
        sessionMap.set(sid, {
          session_id: sid,
          started_at: row.started_at,
          queries: [],
        });
      }

      sessionMap.get(sid)!.queries.push({
        history_id: row.history_id,
        query_text: row.query_text,
        created_at: row.created_at,
      });
    }

    return { success: true, sessions: Array.from(sessionMap.values()) };
  } catch (error: any) {
    console.error("❌ fetchHistory Error:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a single query from nl_query_history by its history_id.
 * Only the owning user can delete their own queries.
 */
export async function deleteQuery(historyId: number): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      throw new Error("Unauthorized: Please sign in again.");
    }

    const [userRows] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [session.user.email]
    ) as [any[], any];
    const userId = userRows[0]?.id;

    if (!userId) {
      throw new Error("User not found in database.");
    }

    const [result] = await pool.query(
      "DELETE FROM nl_query_history WHERE history_id = ? AND user_id = ?",
      [historyId, userId]
    ) as [any, any];

    if (result.affectedRows === 0) {
      throw new Error("Query not found or you do not have permission to delete it.");
    }

    return { success: true };
  } catch (error: any) {
    console.error("❌ deleteQuery Error:", error.message);
    return { success: false, error: error.message };
  }
}
