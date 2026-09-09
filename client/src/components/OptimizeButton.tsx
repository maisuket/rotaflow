import { useAppState } from "../context/AppState";

export function OptimizeButton() {
  const { optimize, loading, error } = useAppState();

  return (
    <div>
      <button className="btn btn-primary btn-block" onClick={() => optimize()} disabled={loading}>
        {loading ? "Otimizando…" : "Otimizar rotas cadastradas"}
      </button>
      {error && <div className="alert alert-error">{error}</div>}
    </div>
  );
}
