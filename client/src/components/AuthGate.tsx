import { FormEvent, ReactNode, useEffect, useState } from "react";
import { api } from "../api/client";
import { getAuthToken, setAuthToken } from "../api/authToken";

type Status = "checking" | "ok" | "disabled" | "needsLogin";

/**
 * Gate de senha compartilhada (nao e login de usuario — so um segredo unico
 * pra impedir acesso nao autorizado se este servidor sair do localhost).
 *
 * Quando o backend nao tem APP_PASSWORD configurada, `authRequired` vem
 * false no /health (publico) e este componente nunca mostra nada — a app
 * renderiza direto, sem nenhuma fricção pro uso local.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const verify = async () => {
    try {
      const health = await api.health();
      if (!health.authRequired) {
        setStatus("disabled");
        return;
      }
      if (!getAuthToken()) {
        setStatus("needsLogin");
        return;
      }
      await api.getSettings();
      setStatus("ok");
    } catch {
      setStatus("needsLogin");
    }
  };

  useEffect(() => {
    verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setAuthToken(password);
    try {
      await api.getSettings();
      setStatus("ok");
    } catch {
      setAuthToken(null);
      setError("Senha incorreta.");
    }
    setSubmitting(false);
  };

  if (status === "checking") {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center" }}>
        <p className="section-hint">Carregando…</p>
      </div>
    );
  }

  if (status === "needsLogin") {
    return (
      <div
        style={{
          display: "flex",
          height: "100vh",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--color-bg)",
        }}
      >
        <form onSubmit={handleSubmit} className="section" style={{ width: 320 }}>
          <div className="section-title">BoraBora — Acesso restrito</div>
          <p className="section-hint">Digite a senha pra continuar.</p>
          <input
            className="input"
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            required
          />
          {error && <div className="alert alert-error">{error}</div>}
          <button
            className="btn btn-primary btn-block"
            type="submit"
            disabled={submitting}
            style={{ marginTop: 10 }}
          >
            {submitting ? "Verificando…" : "Entrar"}
          </button>
        </form>
      </div>
    );
  }

  return <>{children}</>;
}
