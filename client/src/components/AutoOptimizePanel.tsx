import { useState } from "react";
import { useAppState } from "../context/AppState";

function formatDistance(meters: number): string {
  return `${(meters / 1000).toFixed(1)} km`;
}

export function AutoOptimizePanel() {
  const { locations, pendingOutliers, runAutoOptimize, decideOutlier, loading, error } =
    useAppState();
  const [capacity, setCapacity] = useState("4");
  const [open, setOpen] = useState(false);

  // Com pendencia de outlier, o painel tem que ficar visivel pro usuario decidir —
  // nao da pra "ocultar" um alerta que exige acao.
  const hasPendingDecision = pendingOutliers.length > 0;
  const showContent = open || hasPendingDecision;

  return (
    <div className="section">
      <div
        className="section-title"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <span>Modo automático</span>
        {!hasPendingDecision && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOpen((v) => !v)}>
            {open ? "Ocultar" : "Usar modo automático"}
          </button>
        )}
      </div>

      {!showContent && (
        <p className="section-hint" style={{ margin: 0 }}>
          Alternativa sem rotas pré-cadastradas — informe só as localizações e a
          capacidade por veículo.
        </p>
      )}

      {showContent && (
        <>
          <p className="section-hint">
            Não cadastre rotas — informe só as localizações e a capacidade por veículo. O
            sistema calcula quantas rotas são necessárias e escolhe a melhor origem para
            cada uma.
          </p>

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
        </>
      )}
    </div>
  );
}
