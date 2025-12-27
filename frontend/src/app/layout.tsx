import { ReactNode } from "react";
import "../app/globals.css";

export default function RootLayout({
  children
}: {
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-50">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.15),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(14,165,233,0.12),transparent_25%),radial-gradient(circle_at_60%_70%,rgba(34,197,94,0.12),transparent_25%)]" />
      <main className="relative">{children}</main>
    </div>
  );
}

