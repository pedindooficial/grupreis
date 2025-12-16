/* eslint-disable react/no-children-prop */
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
      callbackUrl
    });

    setLoading(false);

    if (res?.error) {
      setError("Credenciais inválidas. Verifique e tente novamente.");
      return;
    }

    if (res?.ok) {
      window.location.href = callbackUrl;
    } else {
      setError("Não foi possível autenticar. Tente novamente.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="glass-panel relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 p-8">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-emerald-400/5 to-transparent" />
        <div className="relative space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-slate-800">
              <img
                src="/logoreis.png"
                alt="Reis Fundações"
                className="h-12 w-12 object-cover"
              />
            </div>
            <div>
              <div className="text-lg font-semibold text-white">
                Reis Fundações
              </div>
              <div className="text-xs text-slate-300">
                Acesse o painel seguro de gestão
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-200">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                placeholder="admin@reis.com"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-200">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                placeholder="********"
                required
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-emerald-400 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:from-blue-600 hover:to-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <div className="text-xs text-slate-400">
            Use o admin definido no .env (
            <span className="font-semibold text-slate-200">ADMIN_EMAIL</span> /
            <span className="font-semibold text-slate-200"> ADMIN_PASSWORD</span>
            ).
          </div>
        </div>
      </div>
    </div>
  );
}

