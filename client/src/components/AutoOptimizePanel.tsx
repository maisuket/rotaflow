import { useState } from "react";
import { useAppState } from "../context/AppState";

function formatDistance(meters: number): string {
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * So os controles de calculo do modo automatico (capacidade + botao +
 * decisao de outliers) — quem decide QUANDO mostrar isso e o OptimizePanel,
 * que tambem controla a alternancia com o modo manual. Sem chrome proprio
 * (titulo/colapsar) porque agora mora dentro do card do OptimizePanel.
 */
export function AutoOptimizePanel() {
  const { locations, pendingOutliers, runAutoOptimize, decideOutlier, loading, error } =
    useAppState();
  const [capacity, setCapacity] = useState("4");

  return (
    <div>
      <div className="field">
        <label className="field-label">Capacidade por veículo</label>
        <input
          className="input"
          type="number"
          min={1}
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          style={{ maxWidth: 100 }}
        />
      </div>

      <button
        className="btn btn-primary btn-block"
        onClick={() => runAutoOptimize(Number(capacity) || 1)}
        disabled={loading || locations.length === 0}
      >
        {loading ? "Calculando…" : "Calcular rotas automaticamente"}
      </button>

      {error && <div className="alert alert-error">{error}</div>}

      {pendingOutliers.length > 0 && (
        <div className="alert alert-warning" style={{ marginTop: 12 }}>
          <strong style={{ display: "block", marginBottom: 4 }}>
            Passageiro(s) muito distante(s) — o que fazer?
          </strong>
          {pendingOutliers.map((o) => (
            <div key={o.locationId} className="outlier-card">
              <div style={{ marginBottom: 6 }}>
                <strong>{o.name}</strong> está a {formatDistance(o.nearestDistanceMeters)}{" "}
                do ponto mais próximo ({o.nearestLocationName}).
              </div>
              <div className="btn-group">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => decideOutlier(o.locationId, "dedicated")}
                >
                  Criar rota exclusiva
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => decideOutlier(o.locationId, "exclude")}
                >
                  Sem rota por enquanto
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
