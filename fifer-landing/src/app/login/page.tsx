"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createFiferBrowserClient } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const sb = createFiferBrowserClient();
      if (!sb) throw new Error("Supabase no configurado");
      const { error: authError } = await sb.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      document.cookie = "fifer_auth=1; Path=/; Max-Age=86400; SameSite=Lax";
      const nextParam =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("next")
          : null;
      router.replace(nextParam || "/finanzas/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <form onSubmit={onSubmit} style={{ width: "100%", maxWidth: 360, display: "grid", gap: 10 }}>
        <h1 style={{ margin: 0 }}>Login</h1>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" required style={{ padding: 10 }} />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" required style={{ padding: 10 }} />
        <button type="submit" disabled={loading} style={{ padding: 10 }}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
        {error ? <p style={{ color: "#ef4444", margin: 0 }}>{error}</p> : null}
      </form>
    </main>
  );
}