import { useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import { TripRecord } from "../types";
import { todayDateString } from "../utils/date";
import { formatClock } from "../utils/format";

export function TripBoardingPanel() {
  const [date, setDate] = useState(todayDateString());
  const [trip, setTrip] = useState<TripRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTrip = async (targetDate: string) => {
    setLoading(true);
    setError(null);
    try {
      const trips = await api.getTrips({ date: targetDate });
      setTrip(trips[0] ?? null);
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
      await api.setTripStopBoarded(trip.id, stop.id, boarded);
      setTrip({
        ...trip,
        routes: trip.routes.map((r, ri) =>
          ri !== tripRouteIndex
            ? r
            : { ...r, stops: r.stops.map((s, si) => (si === stopIndex ? { ...s, boarded } : s)) }
        ),
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    }
  };

  return (
    <div className="section">
      <div className="section-title">Confirmação de embarque</div>

      <div className="field">
        <input
          className="input"
          type="date"
          value={date}
          onChange={(e) => handleDateChange(e.target.value)}
          style={{ maxWidth: 170 }}
        />
      </div>

      {loading && <p className="section-hint">Carregando…</p>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && trip === null && (
        <p className="empty-hint">Nenhuma viagem confirmada para essa data.</p>
      )}

      {!loading &&
        trip &&
        trip.routes.map((route, ri) => {
          const boardedCount = route.stops.filter((s) => s.boarded === true).length;
          const noShowCount = route.stops.filter((s) => s.boarded === false).length;

          return (
            <div className="result-route" key={route.id}>
              <div className="result-route-header">
                <span className="result-route-name">{route.routeName}</span>
                {route.driverName && <span className="badge badge-muted">🧑‍✈️ {route.driverName}</span>}
                <span className="badge badge-primary">
                  {boardedCount}/{route.stops.length} embarcaram
                </span>
                {noShowCount > 0 && <span className="badge badge-danger">{noShowCount} faltou</span>}
              </div>

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
                        {stop.etaSeconds !== null && <> · chegada {formatClock(stop.etaSeconds)}</>}
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
          );
        })}
    </div>
  );
}
