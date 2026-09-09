const EARTH_RADIUS_METERS = 6371000;

export interface LatLng {
  lat: number;
  lng: number;
}

/** Distancia em linha reta (grande circulo) entre dois pontos, em metros. */
export function haversineDistanceMeters(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_METERS * c;
}

/** Estimativa grosseira de duracao assumindo ~40km/h, usada apenas como fallback. */
export function estimateDurationSeconds(distanceMeters: number): number {
  const AVERAGE_SPEED_MPS = 40000 / 3600;
  return distanceMeters / AVERAGE_SPEED_MPS;
}
