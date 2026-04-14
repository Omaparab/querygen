"use server";

import pool from "./db";
import { auth } from "@/auth";
import { getUserRole } from "./rbac";

export interface FeedbackEntry {
  feedback_id: number;
  history_id: number;
  user_email: string;
  query_text: string;
  rating: 1 | -1;
  comments: string | null;
  submitted_at: string;
}

export interface FeedbackStats {
  total: number;
  positive: number;
  negative: number;
  accuracy_pct: number;
  recent: FeedbackEntry[];
  top_failure_comments: { comment: string; count: number }[];
}

/** Submit thumbs-up (1) or thumbs-down (-1) for a generated query */
export async function submitFeedback(
  historyId: number,
  rating: 1 | -1,
  comment?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.email) throw new Error("Unauthorized");

    const [userRows] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [session.user.email]
    ) as [any[], any];
    const userId = userRows[0]?.id;
    if (!userId) throw new Error("User not found.");

    // INSERT IGNORE: one feedback per user per history_id (requires unique key on (history_id, user_id))
    await pool.query(
      `INSERT IGNORE INTO feedback (history_id, user_id, rating, comments)
       VALUES (?, ?, ?, ?)`,
      [historyId, userId, rating, comment ?? null]
    );

    return { success: true };
  } catch (e: any) {
    console.error("❌ submitFeedback:", e.message);
    return { success: false, error: e.message };
  }
}

/** Aggregate feedback stats — for admin panel */
export async function getFeedbackStats(): Promise<{
  success: boolean;
  stats?: FeedbackStats;
  error?: string;
}> {
  try {
    const info = await getUserRole();
    if (!info || info.role !== "admin") {
      throw new Error("Forbidden: Admin access required.");
    }

    // Aggregate counts (MySQL doesn't support FILTER, use SUM+IF instead)
    const [countRows] = await pool.query(`
      SELECT
        COUNT(*)                                    AS total,
        COALESCE(SUM(IF(rating = 1,  1, 0)), 0)    AS positive,
        COALESCE(SUM(IF(rating = -1, 1, 0)), 0)    AS negative
      FROM feedback
    `) as [any[], any];

    const { total, positive, negative } = countRows[0];
    const totalN    = parseInt(total    ?? 0, 10);
    const positiveN = parseInt(positive ?? 0, 10);
    const negativeN = parseInt(negative ?? 0, 10);
    const accuracy_pct = totalN > 0 ? Math.round((positiveN / totalN) * 100) : 0;

    // Recent feedback with query text
    const [recentRows] = await pool.query(`
      SELECT f.feedback_id, f.history_id, u.email AS user_email,
             nlh.query_text, f.rating, f.comments, f.submitted_at
      FROM   feedback f
      JOIN   users u ON u.id = f.user_id
      JOIN   nl_query_history nlh ON nlh.history_id = f.history_id
      ORDER  BY f.submitted_at DESC
      LIMIT  50
    `) as [any[], any];

    // Top failure comments (thumbs-down with non-null comment)
    const [commentsRows] = await pool.query(`
      SELECT comments AS comment, COUNT(*) AS count
      FROM   feedback
      WHERE  rating = -1 AND comments IS NOT NULL AND comments != ''
      GROUP  BY comments
      ORDER  BY count DESC
      LIMIT  10
    `) as [any[], any];

    return {
      success: true,
      stats: {
        total: totalN,
        positive: positiveN,
        negative: negativeN,
        accuracy_pct,
        recent: recentRows as FeedbackEntry[],
        top_failure_comments: commentsRows.map((r: any) => ({
          comment: r.comment,
          count: parseInt(r.count, 10),
        })),
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
