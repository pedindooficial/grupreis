import { type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { backendFetch } from "@/lib/backend-fetch";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" }
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (!email || !password) return null;

        try {
          // Call backend directly (no session needed for login)
          // Uses backendFetch which handles HTTPS with self-signed certificates
          const res = await backendFetch("/auth/login", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
          });

          if (!res.ok) {
            const errorData = await res.json().catch(() => null);
            console.error("Backend login error:", errorData?.error || res.statusText);
            return null;
          }

          const data = await res.json().catch(() => null);
          if (!data?.user) {
            console.error("No user data in response");
            return null;
          }

          return {
            id: data.user.id ?? "admin",
            name: data.user.name ?? "Administrador",
            email: data.user.email ?? email,
            role: data.user.role ?? "admin"
          };
        } catch (error) {
          console.error("Erro ao autenticar no backend", error);
          return null;
        }
      }
    })
  ],
  pages: {
    signIn: "/login"
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role || "user";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role || "user";
      }
      return session;
    }
  }
};

