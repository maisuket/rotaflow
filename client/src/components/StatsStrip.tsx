import { useAppState } from "../context/AppState";
import { formatDistance, formatDuration } from "../utils/format";

/**
 * Resumo rapido flutuando sobre o mapa (rotas/locais cadastrados e, quando ja
 * existe um resultado, distancia/tempo totais) — padrao comum em paineis de
 * despacho (Onfleet, Circuit) para dar visao geral sem precisar abrir nada.
 */
export function StatsStrip() {
  const { routes, locations, result } = useAppState();

  const totalDistance = result
    ? result.routes.reduce((sum, r) => sum + r.totalDistanceMeters, 0)
    : null;
  const totalDuration = result
    ? result.routes.reduce((sum, r) => sum + r.totalDurationSeconds, 0)
    : null;
  const unassigned = result?.unassignedLocationIds.length ?? 0;

  return (
    <div className="stats-strip">
      <span className="stat-chip">
        🚐 <strong>{routes.length}</strong> rota{routes.length === 1 ? "" : "s"}
      </span>
      <span className="stat-chip">
        📍 <strong>{locations.length}</strong> local{locations.length === 1 ? "" : "is"}
      </span>
      {totalDistance !== null && (
        <span className="stat-chip">
          📏 <strong>{formatDistance(totalDistance)}</strong>
        </span>
      )}
      {totalDuration !== null && (
        <span className="stat-chip">
          ⏱ <strong>{formatDuration(totalDuration)}</strong>
        </span>
      )}
      {unassigned > 0 && (
        <span className="stat-chip stat-chip-warning">
          ⚠ <strong>{unassigned}</strong> sem rota
        </span>
      )}
    </div>
  );
}
