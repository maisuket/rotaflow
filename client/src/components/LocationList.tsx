import { useMemo, useState } from "react";
import { LockPosition, useAppState } from "../context/AppState";
import { ConfirmButton } from "./ConfirmButton";
import { timestampTitle } from "../utils/format";

const UNASSIGNED_FILTER = "__unassigned__";

export function LocationList() {
  const { locations, removeLocation, routes, result, lockedPositions, setLockPosition } =
    useAppState();
  const [query, setQuery] = useState("");
  const [routeFilter, setRouteFilter] = useState("");

  const routeNameByLocationId = useMemo(() => {
    const map = new Map<string, string>();
    if (result) {
      for (const route of result.routes) {
        for (const stop of route.stops) {
          map.set(stop.locationId, route.routeName);
        }
      }
    }
    return map;
  }, [result]);

  const filtered = locations.filter((loc) => {
    if (query.trim() && !loc.name.toLowerCase().includes(query.trim().toLowerCase())) {
      return false;
    }
    if (routeFilter) {
      const assignedRouteName = routeNameByLocationId.get(loc.id);
      if (routeFilter === UNASSIGNED_FILTER) {
        if (assignedRouteName) return false;
      } else if (assignedRouteName !== routeFilter) {
        return false;
      }
    }
    return true;
  });

  if (locations.length === 0) {
    return <p className="empty-hint">Nenhuma localização cadastrada.</p>;
  }

  return (
    <>
      <div className="field" style={{ marginTop: 10 }}>
        <input
          className="input"
          placeholder="Buscar por nome…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {result && routes.length > 0 && (
        <div className="field" style={{ marginTop: 6 }}>
          <select
            className="input"
            value={routeFilter}
            onChange={(e) => setRouteFilter(e.target.value)}
          >
            <option value="">Todas as rotas</option>
            {routes.map((route) => (
              <option key={route.id} value={route.name}>
                {route.name}
              </option>
            ))}
            <option value={UNASSIGNED_FILTER}>Sem rota</option>
          </select>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="empty-hint">Nenhuma localização encontrada.</p>
      ) : (
        <ul className="list" style={{ marginTop: 10 }}>
          {filtered.map((loc) => (
            <li className="list-item" key={loc.id} title={timestampTitle(loc)}>
              <span className="list-item-main">
                {loc.name}{" "}
                <span className="list-item-meta">
                  ({loc.lat.toFixed(4)}, {loc.lng.toFixed(4)})
                </span>
              </span>
              <span className="badge badge-muted">{loc.demand} pax</span>
              <select
                className="input"
                title="Travar posição da parada dentro da rota"
                style={{ maxWidth: 108, fontSize: 12, padding: "2px 4px" }}
                value={lockedPositions[loc.id] ?? ""}
                onChange={(e) =>
                  setLockPosition(loc.id, (e.target.value || null) as LockPosition | null)
                }
              >
                <option value="">Sem trava</option>
                <option value="first">🔒 Primeira</option>
                <option value="last">🔒 Última</option>
              </select>
              <div className="list-item-actions">
                <ConfirmButton
                  onConfirm={() => removeLocation(loc.id)}
                  confirmText={`Excluir "${loc.name}"?`}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
