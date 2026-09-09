import { useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import { TripRecord } from "../types";
import { todayDateString } from "../utils/date";
import { formatClock, formatTimeOnly } from "../utils/format";

function driverLinkFor(tripRouteId: string): string {
  return `${window.location.origin}/motorista/${tripRouteId}`;
}

export function TripBoardingPanel() {
  const [date, setDate] = useState(todayDateString());
  const [trip, setTrip] = useState<TripRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedRouteId, setCopiedRouteId] = useState<string | null>(null);
  const [linkOpenForRouteId, setLinkOpenForRouteId] = useState<string | null>(null);
  // Rotas ja totalmente resolvidas (sem nenhuma parada pendente) comecam
  // recolhidas — só a lista de quem ainda falta marcar fica visivel de
  // cara. Recalculado a cada troca de data/carregamento, nao a cada clique
  // (senao a rota "fecharia sozinha" debaixo do dedo do usuario no ultimo clique).
  const [openRouteIds, setOpenRouteIds] = useState<Set<string>>(new Set());

  const copyDriverLink = async (routeId: string) => {
    const url = driverLinkFor(routeId);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedRouteId(routeId);
      window.setTimeout(() => setCopiedRouteId((id) => (id === routeId ? null : id)), 2000);
    } catch {
      // clipboard pode falhar (permissao, contexto nao seguro) — o link ainda
      // fica visivel abaixo do botao pra copiar manualmente.
    }
    setLinkOpenForRouteId((id) => (id === routeId ? null : routeId));
  };

  const toggleRouteOpen = (routeId: string) => {
    setOpenRouteIds((prev) => {
      const next = new Set(prev);
      if (next.has(routeId)) next.delete(routeId);
      else next.add(routeId);
      return next;
    });
  };

  const loadTrip = async (targetDate: string) => {
    setLoading(true);
    setError(null);
    try {
      const trips = await api.getTrips({ date: targetDate });
      const loaded = trips[0] ?? null;
      setTrip(loaded);
      setOpenRouteIds(
        new Set(
          (loaded?.routes ?? [])
            .filter((r) => r.stops.some((s) => s.boarded === null))
            .map((r) => r.id)
        )
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
      setTrip(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTrip(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    loadTrip(newDate);
  };

  const setBoarded = async (tripRouteIndex: number, stopIndex: number, boarded: boolean | null) => {
    if (!trip) return;
    const stop = trip.routes[tripRouteIndex].stops[stopIndex];
    try {
      const updated = await api.setTripStopBoarded(trip.id, stop.id, boarded);
      setTrip({
        ...trip,
        routes: trip.routes.map((r, ri) =>
          ri !== tripRouteIndex
            ? r
            : { ...r, stops: r.stops.map((s, si) => (si === stopIndex ? updated : s)) }
        ),
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    }
  };

  const markAllBoarded = async (tripRouteIndex: number) => {
    if (!trip) return;
    const route = trip.routes[tripRouteIndex];
    // So preenche paradas AINDA NAO marcadas — nunca sobrescreve um "faltou"
    // ja decidido manualmente (isso teria que ser desfeito parada por parada).
    const pending = route.stops.filter((s) => s.boarded === null);
    if (pending.length === 0) return;
    try {
      const updates = await Promise.all(
        pending.map((s) => api.setTripStopBoarded(trip.id, s.id, true))
      );
      const updatedById = new Map(updates.map((u) => [u.id, u]));
      setTrip({
        ...trip,
        routes: trip.routes.map((r, ri) =>
          ri !== tripRouteIndex
            ? r
            : { ...r, stops: r.stops.map((s) => updatedById.get(s.id) ?? s) }
        ),
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    }
  };

  const totalStops = trip ? trip.routes.reduce((sum, r) => sum + r.stops.length, 0) : 0;
  const totalBoarded = trip
    ? trip.routes.reduce((sum, r) => sum + r.stops.filter((s) => s.boarded === true).length, 0)
    : 0;
  const totalNoShow = trip
    ? trip.routes.reduce((sum, r) => sum + r.stops.filter((s) => s.boarded === false).length, 0)
    : 0;
  const totalPending = totalStops - totalBoarded - totalNoShow;

  return (
    <div className="section">
      <div className="boarding-date-row">
        <div className="field" style={{ marginBottom: 0 }}>
          <label className="field-label">Data da viagem</label>
          <input
            className="input"
            type="date"
            value={date}
            onChange={(e) => handleDateChange(e.target.value)}
            style={{ maxWidth: 170 }}
          />
        </div>
        {date !== todayDateString() && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => handleDateChange(todayDateString())}
          >
            Hoje
          </button>
        )}
      </div>

      {loading && <p className="section-hint">Carregando…</p>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && trip === null && (
        <p className="empty-hint">Nenhuma viagem confirmada para essa data.</p>
      )}

      {!loading && trip && (
        <div className="btn-group" style={{ margin: "12px 0", flexWrap: "wrap" }}>
          <span className="stat-chip">
            🚐 {trip.routes.length} rota{trip.routes.length === 1 ? "" : "s"}
          </span>
          <span className="stat-chip">
            ✓ {totalBoarded}/{totalStops} confirmados
          </span>
          {totalNoShow > 0 && (
            <span className="stat-chip stat-chip-warning">✗ {totalNoShow} faltou</span>
          )}
          {totalPending > 0 && <span className="stat-chip">⏳ {totalPending} pendente(s)</span>}
        </div>
      )}

      {!loading &&
        trip &&
        trip.routes.map((route, ri) => {
          const boardedCount = route.stops.filter((s) => s.boarded === true).length;
          const noShowCount = route.stops.filter((s) => s.boarded === false).length;
          const hasPending = route.stops.some((s) => s.boarded === null);
          const isOpen = openRouteIds.has(route.id);

          return (
            <div className="result-route" key={route.id}>
              <button
                type="button"
                className="boarding-route-header"
                onClick={() => toggleRouteOpen(route.id)}
              >
                <span className="boarding-route-toggle">{isOpen ? "▾" : "▸"}</span>
                <span className="boarding-route-name">{route.routeName}</span>
                {route.driverName && (
                  <span className="list-item-meta">🧑‍✈️ {route.driverName}</span>
                )}
                <span className="boarding-route-progress">
                  {boardedCount}/{route.stops.length}
                  {noShowCount > 0 && <span className="boarding-route-noshow"> · {noShowCount} faltou</span>}
                </span>
              </button>

              {isOpen && (
                <div className="boarding-route-body">
                  <div className="btn-group" style={{ marginBottom: 10 }}>
                    {hasPending && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        title="Marca quem ainda está pendente como embarcou — não mexe em quem já foi marcado como faltou"
                        onClick={() => markAllBoarded(ri)}
                      >
                        ✓ Marcar pendentes
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => copyDriverLink(route.id)}
                    >
                      {copiedRouteId === route.id ? "✓ Copiado" : "🔗 Link do motorista"}
                    </button>
                    {route.mapsUrl && (
                      <a
                        className="btn btn-ghost btn-sm"
                        href={route.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        🧭 Ver rota traçada
                      </a>
                    )}
                  </div>

                  {linkOpenForRouteId === route.id && (
                    <input
                      className="input"
                      readOnly
                      value={driverLinkFor(route.id)}
                      onFocus={(e) => e.currentTarget.select()}
                      style={{ marginBottom: 10, fontSize: 12 }}
                    />
                  )}

                  <ol className="boarding-list">
                    {route.stops.map((stop, si) => (
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
                            {stop.boarded === true && stop.boardedAt && (
                              <> · embarcou {formatTimeOnly(stop.boardedAt)}</>
                            )}
                          </div>
                        </div>
                        <div className="boarding-row-actions">
                          <button
                            type="button"
                            className={`boarding-toggle-btn ${stop.boarded === true ? "boarded-on" : ""}`}
                            title="Marcar como embarcou"
                            onClick={() => setBoarded(ri, si, stop.boarded === true ? null : true)}
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            className={`boarding-toggle-btn ${stop.boarded === false ? "no-show-on" : ""}`}
                            title="Marcar como faltou"
                            onClick={() => setBoarded(ri, si, stop.boarded === false ? null : false)}
                          >
                            ✗
                          </button>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}
