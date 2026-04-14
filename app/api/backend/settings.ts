"use server";

import pool from "./db";
import { auth } from "@/auth";

export async function saveURL(url: string) {
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
      "INSERT INTO url_history (user_id, database_url) VALUES (?, ?)",
      [userId, url]
    ) as [any, any];

    console.log(`✅ URL saved for user ${session.user.email}`);
    return { success: true, data: { insertId: result.insertId } };
  } catch (error: any) {
    console.error("❌ saveURL Error:", error.message);
    return { success: false, error: error.message };
  }
}