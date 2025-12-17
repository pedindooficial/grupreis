"use client";

export default function LoadingScreen() {
  return (
    <div
      className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-12 text-slate-100 flex items-center justify-center"
      style={{
        background:
          "radial-gradient(circle at 20% 20%, rgba(16,185,129,0.07), transparent 35%), radial-gradient(circle at 80% 0%, rgba(59,130,246,0.06), transparent 30%), #020617"
      }}
    >
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400 mx-auto mb-2"></div>
        <p className="text-sm text-slate-300">Carregando...</p>
      </div>
    </div>
  );
}

