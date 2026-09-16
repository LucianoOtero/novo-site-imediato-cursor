"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName, password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Falha no login");
        return;
      }
      router.replace(next.startsWith("/") ? next : "/");
      router.refresh();
    } catch {
      setError("Erro de rede");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <form className="card" style={{ width: "100%", maxWidth: 380 }} onSubmit={onSubmit}>
        <h1 style={{ margin: "0 0 4px", fontSize: 20 }}>Produção comercial</h1>
        <p className="muted" style={{ margin: "0 0 16px", fontSize: 13 }}>
          Entre com seu usuário EspoCRM
        </p>
        <label className="muted" style={{ display: "block", fontSize: 12, marginBottom: 4 }}>
          Usuário
        </label>
        <input
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          autoComplete="username"
          required
          style={{
            width: "100%",
            marginBottom: 12,
            padding: "8px 10px",
            borderRadius: 6,
            border: "1px solid var(--border)",
            background: "var(--panel-2)",
            color: "var(--text)",
          }}
        />
        <label className="muted" style={{ display: "block", fontSize: 12, marginBottom: 4 }}>
          Senha
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          style={{
            width: "100%",
            marginBottom: 16,
            padding: "8px 10px",
            borderRadius: 6,
            border: "1px solid var(--border)",
            background: "var(--panel-2)",
            color: "var(--text)",
          }}
        />
        {error ? (
          <p className="err" style={{ margin: "0 0 12px", fontSize: 13 }}>
            {error}
          </p>
        ) : null}
        <button className="btn" type="submit" disabled={loading} style={{ width: "100%" }}>
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
