export interface MapsPoint {
  lat: number;
  lng: number;
}

/**
 * Constroi um link publico do Google Maps com o trajeto ja na ordem
 * calculada, pronto pra abrir no celular do motorista (app ou navegador) —
 * sem precisar de nenhum app do BoraBora nem de chave de API (o esquema de
 * URLs do Google Maps e publico). Nao reotimiza a ordem dos waypoints.
 *
 * Espelha EXATAMENTE a mesma logica de origin/waypoints/destination de
 * `fetchRouteDirections` (mesmos 3 argumentos) — chamar com os mesmos
 * valores garante que o link abre o trajeto certinho que foi calculado.
 */
export function buildGoogleMapsLink(
  origin: MapsPoint,
  orderedStops: MapsPoint[],
  endPoint: MapsPoint | null
): string | null {
  const hasRealEndpoint = endPoint && (endPoint.lat !== origin.lat || endPoint.lng !== origin.lng);
  if (orderedStops.length === 0 && !hasRealEndpoint) return null;

  const destination = endPoint ?? orderedStops[orderedStops.length - 1];
  const waypoints = endPoint ? orderedStops : orderedStops.slice(0, -1);

  const toParam = (p: MapsPoint) => `${p.lat},${p.lng}`;
  const params = new URLSearchParams({
    api: "1",
    origin: toParam(origin),
    destination: toParam(destination),
    travelmode: "driving",
  });
  if (waypoints.length > 0) {
    params.set("waypoints", waypoints.map(toParam).join("|"));
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
