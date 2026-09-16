import { Suspense } from "react";
import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
          <p className="muted">Carregando…</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
