import { useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import { DriverRouteView } from "../types";
import { formatClock } from "../utils/format";

/**
 * Pagina publica e independente do resto do app (sem AuthGate, sem
 * AppState/sidebar/mapa) — e o que abre em /motorista/:tripRouteId. Feita
 * pra rodar no celular do motorista: so a rota dele, so o essencial pra
 * marcar quem embarcou.
 */
export function DriverBoardingView({ tripRouteId }: { tripRouteId: string }) {
  const [view, setView] = useState<DriverRouteView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setView(await api.getDriverRoute(tripRouteId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
      setView(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setBoarded = async (stopId: string, boarded: boolean | null) => {
    if (!view) return;
    try {
      const updatedStop = await api.setDriverStopBoarded(tripRouteId, stopId, boarded);
      setView({ ...view, stops: view.stops.map((s) => (s.id === stopId ? updatedStop : s)) });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    }
  };

  if (loading) {
    return (
      <div className="driver-view-status">
        <p className="section-hint">Carregando…</p>
      </div>
    );
  }

  if (!view) {
    return (
      <div className="driver-view-status">
        <p className="alert alert-error">{error ?? "Link inválido."}</p>
      </div>
    );
  }

  const boardedCount = view.stops.filter((s) => s.boarded === true).length;
  const noShowCount = view.stops.filter((s) => s.boarded === false).length;
  const [year, month, day] = view.date.split("-");

  return (
    <div className="driver-view">
      <div className="driver-view-header">
        <div className="driver-view-title">{view.routeName}</div>
        <div className="driver-view-meta">
          {day}/{month}/{year}
          {view.vehiclePlate && <> · {view.vehiclePlate}</>}
          {view.vehicleTypeLabel && <> · {view.vehicleTypeLabel}</>}
        </div>
        {view.destinationName && (
          <div className="driver-view-meta">Destino: {view.destinationName}</div>
        )}
        <div className="driver-view-progress">
          <span className="badge badge-primary">
            {boardedCount}/{view.stops.length} embarcaram
          </span>
          {noShowCount > 0 && <span className="badge badge-danger">{noShowCount} faltou</span>}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <ol className="boarding-list">
        {view.stops.map((stop) => (
          <li
            key={stop.id}
            className={`boarding-row ${
              stop.boarded === true ? "is-boarded" : stop.boarded === false ? "is-no-show" : ""
            }`}
          >
            <div className="boarding-row-info">
              <div className="boarding-row-name">{stop.name}</div>
              <div className="boarding-row-meta">
                {stop.demand} pax
                {stop.etaSeconds !== null && <> · previsto {formatClock(stop.etaSeconds)}</>}
              </div>
            </div>
            <div className="boarding-row-actions">
              <button
                type="button"
                className={`boarding-toggle-btn ${stop.boarded === true ? "boarded-on" : ""}`}
                title="Marcar como embarcou"
                onClick={() => setBoarded(stop.id, stop.boarded === true ? null : true)}
              >
                ✓
              </button>
              <button
                type="button"
                className={`boarding-toggle-btn ${stop.boarded === false ? "no-show-on" : ""}`}
                title="Marcar como faltou"
                onClick={() => setBoarded(stop.id, stop.boarded === false ? null : false)}
              >
                ✗
              </button>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
