"use client";
import { useState } from "react";

export function AdminLogin({ configured }: { configured: boolean }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <main className="mpa-login">
      <span className="mpa-pulse mpa-pulse-lg" aria-hidden="true" />
      <h1>Panel de simulación</h1>
      <p className="mpa-muted">Entrena el modelo, aplica escenarios y compara el menú fijo contra la IA.</p>
      {!configured ? (
        <p>
          El panel está cerrado porque falta la variable <code>ADMIN_ACCESS_CODE</code> en el servidor. Agrégala en las variables de
          entorno (en Vercel: Settings → Environment Variables) y vuelve a desplegar.
        </p>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            const res = await fetch("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code }) });
            setBusy(false);
            if (res.ok) window.location.reload();
            else setError("El código no coincide con ADMIN_ACCESS_CODE.");
          }}
        >
          <label htmlFor="mpa-code">Código de acceso</label>
          <input id="mpa-code" type="password" autoComplete="current-password" value={code} onChange={(e) => setCode(e.target.value)} required />
          <button type="submit" className="mpa-primary" disabled={busy}>
            {busy ? "Verificando…" : "Entrar al panel"}
          </button>
          {error && (
            <p className="mpa-error" role="alert">
              {error}
            </p>
          )}
        </form>
      )}
    </main>
  );
}
