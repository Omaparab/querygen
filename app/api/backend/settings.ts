"use server";

import pool from "./db";
import { auth } from "@/auth";

export async function saveURL(url: string) {
  try {
    // 1. Authenticate the user session
    const session = await auth();
    if (!session?.user?.email) {
      throw new Error("Unauthorized: Please sign in again.");
    }

    // 2. Fetch the User ID from the 'users' table using the email
    const userRes = await pool.query("SELECT id FROM users WHERE email = $1", [
      session.user.email,
    ]);
    const userId = userRes.rows[0]?.id;

    if (!userId) {
      throw new Error("User not found in database.");
    }

    // 3. Insert the URL into the 'url_history' table
    const query = `
      INSERT INTO url_history (user_id, database_url) 
      VALUES ($1, $2) 
      RETURNING *;
    `;

    const result = await pool.query(query, [userId, url]);

    console.log(`✅ URL saved for user ${session.user.email}`);
    return { success: true, data: result.rows[0] };
  } catch (error: any) {
    console.error("❌ saveURL Error:", error.message);
    return { success: false, error: error.message };
  }
}