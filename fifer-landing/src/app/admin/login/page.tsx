"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/admin/ai-health";
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "No autorizado");
      }
      router.replace(nextPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <h1 className="font-fifer-heading text-xl font-bold text-zinc-100">Acceso administración</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Introduce la clave configurada en <code className="text-zinc-300">FIFER_ADMIN_SECRET</code>.
      </p>
      <form onSubmit={onSubmit} className="mt-6 grid gap-3">
        <input
          type="password"
          autoComplete="off"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="Clave administración"
          required
          className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100 outline-none ring-emerald-600/40 focus:ring-2"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
        >
          {loading ? "Validando…" : "Continuar"}
        </button>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </form>
      <Link href="/" className="mt-8 text-center text-sm text-zinc-500 hover:text-zinc-300">
        Volver al inicio
      </Link>
    </main>
  );
}

/**
 * Segundo factor local: cookie HttpOnly tras validar `FIFER_ADMIN_SECRET`.
 * Requiere sesión app (`fifer_auth`) vía middleware.
 */
export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0A0F1E] text-sm text-zinc-500">
          Cargando…
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
