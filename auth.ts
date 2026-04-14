import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import pool from "./app/api/backend/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
      }
      // Always refresh role from DB on sign-in or explicit refresh
      if (token.id !== undefined || trigger === "signIn" || trigger === "update") {
        try {
          const email = token.email;
          if (email) {
            const [rows] = await pool.query(
              "SELECT role FROM users WHERE email = ?",
              [email]
            ) as [any[], any];
            token.role = rows[0]?.role ?? "viewer";
          }
        } catch {
          token.role = "viewer";
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as "admin" | "auditor_read" | "auditor_write" | "viewer") ?? "viewer";
      }
      return session;
    },
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          const [rows] = await pool.query(
            "SELECT id FROM users WHERE email = ?",
            [user.email]
          ) as [any[], any];

          if (rows.length === 0) {
            // Insert new user with default role 'viewer'
            await pool.query(
              "INSERT INTO users (email, role) VALUES (?, 'viewer')",
              [user.email]
            );
          }
        } catch (e) {
          console.error("signIn callback error:", e);
          return false;
        }
      }
      return true;
    },
  },
});
