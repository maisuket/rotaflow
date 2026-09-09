/** Converte "HH:MM" (24h) em segundos desde a meia-noite. Retorna null se invalido. */
export function timeStringToSeconds(time: string | null | undefined): number | null {
  if (!time) return null;
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours * 3600 + minutes * 60;
}
