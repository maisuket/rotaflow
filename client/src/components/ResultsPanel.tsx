import { useState } from "react";
import { useAppState } from "../context/AppState";
import { colorForRouteIndex } from "../utils/colors";
import { shapeForRouteIndex } from "../utils/shapes";
import { RouteShapeIcon } from "./RouteShapeIcon";
import { formatClock, formatDistance, formatDuration } from "../utils/format";

function UnassignedRow({ locationId, name }: { locationId: string; name: string }) {
  const { routes, assignLocationToRoute, loading } = useAppState();
  const [selectedRouteId, setSelectedRouteId] = useState(routes[0]?.id ?? "");

  return (
    <div className="outlier-card">
      <div style={{ marginBottom: 6 }}>{name}</div>
      {routes.length > 0 ? (
        <div className="btn-group">
          <select
            className="input"
            style={{ maxWidth: 180 }}
            value={selectedRouteId}
            onChange={(e) => setSelectedRouteId(e.target.value)}
          >
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <button
            className="btn btn-secondary btn-sm"
            disabled={loading || !selectedRouteId}
            onClick={() => assignLocationToRoute(locationId, selectedRouteId)}
          >
            Adicionar nessa rota
          </button>
        </div>
      ) : (
        <span className="list-item-meta">Nenhuma rota cadastrada para atribuir.</span>
      )}
    </div>
  );
}

function formatCost(value: number): string {
  return `R$ ${value.toFixed(2)}`;
}

export function ResultsPanel() {
  const { result, locations, routes, reorderStop, confirmTrip, loading } = useAppState();
  const [confirming, setConfirming] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);

  if (!result) return null;

  const colorByRouteId = new Map(routes.map((r, i) => [r.id, colorForRouteIndex(i)]));
  const shapeByRouteId = new Map(routes.map((r, i) => [r.id, shapeForRouteIndex(i)]));
  const inactiveRouteNames = (result.inactiveRouteIds ?? [])
    .map((id) => routes.find((r) => r.id === id)?.name ?? id);

  const handleConfirmTrip = async () => {
    setConfirming(true);
    setConfirmMessage(null);
    const trip = await confirmTrip();
    setConfirming(false);
    setConfirmMessage(
      trip ? `Viagem de ${trip.date} confirmada com ${trip.routes.length} rota(s).` : null
    );
  };

  return (
    <div style={{ marginTop: 14 }}>
      <div className="section-title">Resultado</div>

      {inactiveRouteNames.length > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: 8 }}>
          Não roda hoje (recorrência semanal): {inactiveRouteNames.join(", ")}
        </div>
      )}

      <button
        className="btn btn-success btn-block"
        style={{ marginBottom: 10 }}
        onClick={handleConfirmTrip}
        disabled={confirming || loading}
      >
        {confirming ? "Confirmando…" : "✅ Confirmar viagem de hoje"}
      </button>
      {confirmMessage && (
        <div className="alert alert-success" style={{ marginBottom: 10 }}>
          {confirmMessage}
        </div>
      )}

      {result.routes.map((route, i) => (
        <div className="result-route" key={route.routeId}>
          <div className="result-route-header">
            <RouteShapeIcon
              shape={shapeByRouteId.get(route.routeId) ?? shapeForRouteIndex(i)}
              color={colorByRouteId.get(route.routeId) ?? colorForRouteIndex(i)}
            />
            <span
              className="result-route-name"
              style={{ color: colorByRouteId.get(route.routeId) }}
            >
              {route.routeName}
            </span>
            <span className="list-item-meta">
              {route.stops.length} paradas · {formatDistance(route.totalDistanceMeters)} ·{" "}
              {formatDuration(route.totalDurationSeconds)}
            </span>
            {route.destination?.name && (
              <span className="badge badge-primary">→ {route.destination.name}</span>
            )}
            {route.finalArrivalSeconds !== undefined && (
              <span className="badge badge-muted">chegada {formatClock(route.finalArrivalSeconds)}</span>
            )}
            {route.driverName && <span className="badge badge-muted">🧑‍✈️ {route.driverName}</span>}
            {route.vehiclePlate && <span className="badge badge-muted">{route.vehiclePlate}</span>}
            {route.estimatedCost !== undefined && (
              <span className="badge badge-muted">{formatCost(route.estimatedCost)}</span>
            )}
          </div>
          {!route.directions.available && (
            <div className="alert alert-warning" style={{ marginTop: 6 }}>
              Trajeto real indisponível: {route.directions.error}
            </div>
          )}
          <ol className="result-stops">
            {route.stops.map((stop, idx) => (
              <li key={stop.locationId} className="result-stop-row">
                <span>
                  {stop.name} ({stop.demand} pax)
                  {stop.etaSeconds !== undefined && <> — {formatClock(stop.etaSeconds)}</>}
                </span>
                <span className="result-stop-actions">
                  <button
                    type="button"
                    className="icon-btn"
                    title="Mover para cima"
                    disabled={idx === 0 || loading}
                    onClick={() => reorderStop(route.routeId, idx, idx - 1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    title="Mover para baixo"
                    disabled={idx === route.stops.length - 1 || loading}
                    onClick={() => reorderStop(route.routeId, idx, idx + 1)}
                  >
                    ↓
                  </button>
                </span>
              </li>
            ))}
          </ol>
          {route.mapsUrl && (
            <a
              className="btn btn-secondary btn-sm"
              style={{ marginTop: 8 }}
              href={route.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              🧭 Abrir no Google Maps
            </a>
          )}
        </div>
      ))}
      {result.unassignedLocationIds.length > 0 && (
        <div className="alert alert-error">
          <strong style={{ display: "block", marginBottom: 4 }}>
            {result.unassignedLocationIds.length} localização(ões) sem rota
          </strong>
          {result.unassignedLocationIds.map((id) => (
            <UnassignedRow
              key={id}
              locationId={id}
              name={locations.find((l) => l.id === id)?.name ?? id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
