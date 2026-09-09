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

/** ISO 8601 -> "DD/MM/AAAA HH:MM" no fuso local do navegador. */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("pt-BR");
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${date} ${time}`;
}

/** ISO 8601 -> "HH:MM" no fuso local do navegador (sem a parte da data). */
export function formatTimeOnly(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/** Segundos de atraso (negativo = adiantado) -> rótulo curto pro relatório de pontualidade. */
export function formatDelay(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes === 0) return "no horário";
  return minutes > 0 ? `${minutes} min atraso` : `${Math.abs(minutes)} min adiantado`;
}

/**
 * Tooltip com data de cadastro/edição, pra usar como `title` num item de
 * lista — só aparece ao passar o mouse, não ocupa espaço na tela.
 */
export function timestampTitle(entity: { createdAt?: string; updatedAt?: string }): string | undefined {
  if (!entity.createdAt) return undefined;
  const created = `Criado em ${formatDateTime(entity.createdAt)}`;
  if (!entity.updatedAt || entity.updatedAt === entity.createdAt) return created;
  return `${created}\nAtualizado em ${formatDateTime(entity.updatedAt)}`;
}
