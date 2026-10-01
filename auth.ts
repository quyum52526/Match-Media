import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

/**
 * Auth.js (NextAuth v5) — Credentials provider backed by our Prisma `User`
 * (email + passwordHash). Sessions are JWT (required for Credentials), so no
 * database adapter is needed. The user id is threaded into the token/session.
 *
 * NOTE: this config is intentionally NOT imported into middleware (next-intl
 * owns middleware), so the Node-only deps (prisma, bcryptjs) never reach edge.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Normalized the SAME way registration stores it (trim + lowercase).
        // Without this, `findUnique` is an exact, case-sensitive match while
        // signup lowercases — so a member who registered as "Name@x.com" is
        // stored lowercase and then cannot log in by typing it back the way
        // they wrote it. Browsers and phone keyboards capitalize the first
        // letter by default, so this presented as "Invalid email or password"
        // on a correct password.
        const email =
          typeof credentials?.email === "string"
            ? credentials.email.trim().toLowerCase()
            : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        // A bcrypt hash is exactly 60 characters and contains no whitespace.
        // A stored value with padding is corrupt data — the signature of a hash
        // pasted into a DB console or echoed through a shell, which appends a
        // newline. bcrypt.compare() returns false for such a value rather than
        // throwing, so the account presents as "Invalid email or password" with
        // nothing in the logs to explain it. Trimming cannot weaken
        // verification (whitespace can never make a wrong password match), and
        // the warning means the bad row gets noticed instead of becoming a
        // lockout nobody can diagnose.
        const storedHash = user.passwordHash.trim();
        if (storedHash !== user.passwordHash || storedHash.length !== 60) {
          console.warn(
            `[auth] malformed passwordHash for user ${user.id}: stored length ` +
              `${user.passwordHash.length}, expected 60. Re-hash this row.`,
          );
        }

        const valid = await bcrypt.compare(password, storedHash);
        if (!valid) return null;

        return { id: user.id, email: user.email };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.id === "string") {
        session.user.id = token.id;
      }
      return session;
    },
  },
});
