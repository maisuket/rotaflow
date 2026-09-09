export interface CachePoint {
  lat: number;
  lng: number;
}

/**
 * Chave estavel de um ponto (arredondado a 6 casas decimais — ~11cm de
 * precisao, mais que suficiente pra diferenciar enderecos distintos, mas
 * insensivel a ruido de ponto flutuante).
 */
export function pointKey(p: CachePoint): string {
  return `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;
}

/** Chave de um par origem->destino (Distance Matrix). Direcao importa (A->B != B->A). */
export function distancePairKey(origin: CachePoint, destination: CachePoint): string {
  return `${pointKey(origin)}|${pointKey(destination)}`;
}

/**
 * Chave de um trajeto completo (Directions): origem + paradas na ordem exata
 * + destino. Qualquer mudanca na ordem das paradas gera uma chave diferente
 * (o trajeto real muda).
 */
export function directionsRouteKey(
  origin: CachePoint,
  waypoints: CachePoint[],
  destination: CachePoint
): string {
  return [pointKey(origin), ...waypoints.map(pointKey), pointKey(destination)].join(">");
}

/** Chave de uma busca de geocodificacao — normaliza espacos e caixa (mesma busca, mesma chave). */
export function geocodeQueryKey(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}
