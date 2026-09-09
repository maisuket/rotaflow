import { useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import { TripRecord } from "../types";
import { firstDayOfMonthString, todayDateString } from "../utils/date";
import { formatDistance, formatDuration } from "../utils/format";

interface RouteAgg {
  routeName: string;
  trips: number;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  totalCost: number;
  occupancySum: number;
  occupancyCount: number;
}

function aggregateByRoute(trips: TripRecord[]): RouteAgg[] {
  const byName = new Map<string, RouteAgg>();
  for (const trip of trips) {
    for (const route of trip.routes) {
      const agg = byName.get(route.routeName) ?? {
        routeName: route.routeName,
        trips: 0,
        totalDistanceMeters: 0,
        totalDurationSeconds: 0,
        totalCost: 0,
        occupancySum: 0,
        occupancyCount: 0,
      };
      agg.trips += 1;
      agg.totalDistanceMeters += route.totalDistanceMeters;
      agg.totalDurationSeconds += route.totalDurationSeconds;
      agg.totalCost += route.estimatedCost ?? 0;
      if (route.capacity > 0) {
        const demand = route.stops.reduce((sum, s) => sum + s.demand, 0);
        agg.occupancySum += demand / route.capacity;
        agg.occupancyCount += 1;
      }
      byName.set(route.routeName, agg);
    }
  }
  return [...byName.values()].sort((a, b) => b.totalDistanceMeters - a.totalDistanceMeters);
}

export function ReportsPanel() {
  const [from, setFrom] = useState(firstDayOfMonthString());
  const [to, setTo] = useState(todayDateString());
  const [trips, setTrips] = useState<TripRecord[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReport = async (fromDate: string, toDate: string) => {
    setLoading(true);
    setError(null);
    try {
      setTrips(await api.getTrips({ from: fromDate, to: toDate }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
      setTrips(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadReport(from, to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const routeAggs = trips ? aggregateByRoute(trips) : [];
  const totalDistanceMeters = routeAggs.reduce((sum, r) => sum + r.totalDistanceMeters, 0);
  const totalCost = routeAggs.reduce((sum, r) => sum + r.totalCost, 0);
  const totalDurationSeconds = routeAggs.reduce((sum, r) => sum + r.totalDurationSeconds, 0);

  return (
    <div className="section">
      <div className="section-title">Relatórios</div>

      <div className="input-row" style={{ marginBottom: 8 }}>
        <input
          className="input"
          type="date"
          value={from}
          onChange={(e) => {
            setFrom(e.target.value);
            loadReport(e.target.value, to);
          }}
        />
        <input
          className="input"
          type="date"
          value={to}
          onChange={(e) => {
            setTo(e.target.value);
            loadReport(from, e.target.value);
          }}
        />
      </div>

      {loading && <p className="section-hint">Carregando…</p>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && trips && trips.length === 0 && (
        <p className="empty-hint">Nenhuma viagem confirmada nesse período.</p>
      )}

      {!loading && trips && trips.length > 0 && (
        <>
          <div className="btn-group" style={{ marginBottom: 10, flexWrap: "wrap" }}>
            <span className="badge badge-primary">{trips.length} viagem(ns)</span>
            <span className="badge badge-muted">{formatDistance(totalDistanceMeters)} total</span>
            <span className="badge badge-muted">{formatDuration(totalDurationSeconds)} total</span>
            {totalCost > 0 && (
              <span className="badge badge-muted">R$ {totalCost.toFixed(2)} estimado</span>
            )}
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid var(--color-border)" }}>
                  <th style={{ padding: "4px 6px" }}>Rota</th>
                  <th style={{ padding: "4px 6px" }}>Viagens</th>
                  <th style={{ padding: "4px 6px" }}>Km total</th>
                  <th style={{ padding: "4px 6px" }}>Custo</th>
                  <th style={{ padding: "4px 6px" }}>Ocupação média</th>
                </tr>
              </thead>
              <tbody>
                {routeAggs.map((r) => (
                  <tr key={r.routeName} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "4px 6px" }}>{r.routeName}</td>
                    <td style={{ padding: "4px 6px" }}>{r.trips}</td>
                    <td style={{ padding: "4px 6px" }}>{formatDistance(r.totalDistanceMeters)}</td>
                    <td style={{ padding: "4px 6px" }}>
                      {r.totalCost > 0 ? `R$ ${r.totalCost.toFixed(2)}` : "—"}
                    </td>
                    <td style={{ padding: "4px 6px" }}>
                      {r.occupancyCount > 0
                        ? `${Math.round((r.occupancySum / r.occupancyCount) * 100)}%`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
