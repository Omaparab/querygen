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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
    async signIn({ user, account, profile }) {
    if (account?.provider === "google") {
      // Check if user exists in your Postgres DB
      const existingUser = await pool.query("SELECT * FROM users WHERE email = $1", [user.email]);
      
      if (existingUser.rowCount == 0) {
        // Manually insert the new user
        await pool.query("INSERT INTO users (email) VALUES ($1)", 
          [user.email]);
      }
    }
    return true; // Allow sign in
  },
  },
});



