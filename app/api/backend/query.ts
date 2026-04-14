"use server";

import pool from "./db";
import { auth } from "@/auth";

export async function saveNLQuery(queryText: string, sessionId?: string) {
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

    // Ensure a row exists in query_sessions for this session
    if (sessionId) {
      await pool.query(
        `INSERT IGNORE INTO query_sessions (session_id, user_id, started_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)`,
        [sessionId, userId]
      );
    }

    const [result] = await pool.query(
      `INSERT INTO nl_query_history (user_id, query_text, session_id)
       VALUES (?, ?, ?)`,
      [userId, queryText, sessionId ?? null]
    ) as [any, any];

    console.log(`✅ NL query saved for user ${session.user.email}`);
    return { success: true, data: { insertId: result.insertId } };
  } catch (error: any) {
    console.error("❌ saveNLQuery Error:", error.message);
    return { success: false, error: error.message };
  }
}