export function formatDistance(meters: number): string {
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number): string {
  return `${Math.round(seconds / 60)} min`;
}

/** Segundos desde a meia-noite -> "HH:MM". Ultrapassar 24h "enrola" pro dia seguinte. */
export function formatClock(seconds: number): string {
  const wrapped = (((Math.round(seconds / 60) * 60) % 86400) + 86400) % 86400;
  const h = Math.floor(wrapped / 3600);
  const m = Math.floor((wrapped % 3600) / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
