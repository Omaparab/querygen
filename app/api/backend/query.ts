"use server";

import pool from "./db";
import { auth } from "@/auth";

export async function saveNLQuery(queryText: string, sessionId?: string) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      throw new Error("Unauthorized: Please sign in again.");
    }

    const userRes = await pool.query("SELECT id FROM users WHERE email = $1", [
      session.user.email,
    ]);
    const userId = userRes.rows[0]?.id;

    if (!userId) {
      throw new Error("User not found in database.");
    }

    // Ensure a row exists in query_sessions for this session
    if (sessionId) {
      await pool.query(
        `INSERT INTO query_sessions (session_id, user_id, started_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (session_id) DO NOTHING`,
        [sessionId, userId]
      );
    }

    const query = `
      INSERT INTO nl_query_history (user_id, query_text, session_id)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;

    const result = await pool.query(query, [userId, queryText, sessionId ?? null]);

    console.log(`✅ NL query saved for user ${session.user.email}`);
    return { success: true, data: result.rows[0] };
  } catch (error: any) {
    console.error("❌ saveNLQuery Error:", error.message);
    return { success: false, error: error.message };
  }
}