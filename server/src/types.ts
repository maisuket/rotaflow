export interface Location {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** Numero de passageiros representados por esta localizacao. Default 1. */
  demand: number;
}

/**
 * "depot": a rota comeca (e volta, se returnToDepot) no depositoLat/Lng cadastrado.
 * "firstPassenger": o depositoLat/Lng so serve de referencia geografica para
 * decidir quais passageiros pertencem a essa rota (fase de alocacao) — o
 * trajeto de fato comeca em qualquer um dos passageiros ja atribuidos, o que
 * a otimizacao (TSP de caminho aberto) decidir ser o melhor ponto de partida.
 */
export type RouteOriginMode = "depot" | "firstPassenger";

export interface RouteVehicle {
  id: string;
  name: string;
  depotLat: number;
  depotLng: number;
  capacity: number;
  /** Se o veiculo deve retornar ao deposito ao final do trajeto. Default true. Ignorado quando originMode="firstPassenger". */
  returnToDepot: boolean;
  /** Default "depot". */
  originMode: RouteOriginMode;
  driverName: string | null;
  driverPhone: string | null;
  vehiclePlate: string | null;
  /** Rotulo livre (ex: "Carro", "Van", "Onibus") — so exibicao, nao afeta o algoritmo. */
  vehicleTypeLabel: string | null;
  /** Multiplicador aplicado a duracao/ETA (1 = normal, >1 = mais lento). Nao afeta distancia nem a ordem escolhida pelo TSP. */
  speedFactor: number;
  /** Custo estimado por km — so pra exibir/relatar, nao afeta o algoritmo. */
  costPerKm: number;
  /** Dias da semana em que esta rota roda (0=domingo..6=sabado, igual Date.getDay()). Null = roda todo dia. */
  activeWeekdays: number[] | null;
}

/**
 * Destino unico e compartilhado por TODAS as rotas (ex: "todo mundo vai pra fabrica X").
 * Quando definido, substitui o retorno ao proprio deposito de cada rota: toda rota passa
 * a terminar aqui em vez de voltar para seu depositoLat/Lng. Quando null, cada rota usa
 * seu proprio comportamento (`returnToDepot`).
 */
export interface GlobalDestination {
  lat: number;
  lng: number;
  name: string;
}

export interface DistanceMatrix {
  distanceMeters: number[][];
  durationSeconds: number[][];
}

export interface RouteAssignmentResult {
  routeId: string;
  locationIds: string[];
}

export interface AssignmentResult {
  assignments: RouteAssignmentResult[];
  unassignedLocationIds: string[];
}

export interface TspResult {
  /** Indices (no espaco de pontos da rota: [deposito, ...paradas]) na ordem de visita, comecando e terminando no deposito. */
  order: number[];
  totalDistanceMeters: number;
  totalDurationSeconds: number;
}

export interface DirectionsLeg {
  distanceMeters: number;
  durationSeconds: number;
}

export interface DirectionsInfo {
  available: boolean;
  encodedPolyline?: string;
  legs?: DirectionsLeg[];
  error?: string;
}

export interface OptimizedStop {
  locationId: string;
  name: string;
  lat: number;
  lng: number;
  demand: number;
  /** Segundos desde a meia-noite, estimativa de chegada. So presente quando um horario de partida foi configurado. */
  etaSeconds?: number;
}

export interface OptimizedRouteResult {
  routeId: string;
  routeName: string;
  depot: { lat: number; lng: number };
  /** Ponto final real desta rota: o destino global (se configurado), o proprio deposito
   * (se retorna ao deposito), ou null (trajeto aberto terminando na ultima parada). */
  destination: { lat: number; lng: number; name?: string } | null;
  stops: OptimizedStop[];
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  directions: DirectionsInfo;
  /** Segundos desde a meia-noite, chegada estimada no ponto final. So presente com horario de partida configurado. */
  finalArrivalSeconds?: number;
  /** Link publico do Google Maps com o trajeto ja na ordem calculada, pronto pra abrir no celular do motorista. Null se a rota nao tem paradas. */
  mapsUrl: string | null;
  /** Capacidade do veiculo desta rota (usado pra calcular taxa de ocupacao nos relatorios). */
  capacity: number;
  driverName?: string | null;
  driverPhone?: string | null;
  vehiclePlate?: string | null;
  vehicleTypeLabel?: string | null;
  /** totalDistanceMeters/1000 * costPerKm da rota. Undefined se a rota nao tem costPerKm configurado. */
  estimatedCost?: number;
}

export interface OptimizeResponse {
  routes: OptimizedRouteResult[];
  unassignedLocationIds: string[];
  generatedAt: string;
  /** Rotas cadastradas que existem mas ficaram de fora desta otimizacao por causa da recorrencia semanal (nao ativa hoje). */
  inactiveRouteIds?: string[];
}

/** Uma localizacao muito distante das demais, aguardando o usuario decidir o que fazer com ela. */
export interface PendingOutlier {
  locationId: string;
  name: string;
  nearestDistanceMeters: number;
  nearestLocationName: string;
}

export type OutlierDecision = "dedicated" | "exclude";

export interface AutoOptimizeResponse {
  routes: OptimizedRouteResult[];
  /** Localizacoes definitivamente excluidas (usuario escolheu "sem rota por enquanto"). */
  unassignedLocationIds: string[];
  /** Localizacoes muito distantes ainda sem decisao do usuario — nao entraram em nenhuma rota ainda. */
  pendingOutliers: PendingOutlier[];
  generatedAt: string;
}

/** Configuracoes globais simples. Por enquanto so o horario de partida ("HH:MM", 24h), usado pra calcular ETA por parada. */
export interface GlobalSettings {
  departureTime: string | null;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

/**
 * Uma viagem CONFIRMADA (nao todo clique em "Otimizar" — so quando o usuario
 * explicitamente confirma). Guarda uma foto dos dados no momento da
 * confirmacao; alimenta o dashboard de relatorios e a tela de embarque.
 */
export interface TripStopRecord {
  id: string;
  locationId: string | null;
  name: string;
  lat: number;
  lng: number;
  demand: number;
  order: number;
  etaSeconds: number | null;
  /** null = ainda nao marcado, true = embarcou, false = nao embarcou (no-show). */
  boarded: boolean | null;
}

export interface TripRouteRecord {
  id: string;
  routeId: string | null;
  routeName: string;
  driverName: string | null;
  driverPhone: string | null;
  vehiclePlate: string | null;
  vehicleTypeLabel: string | null;
  depot: { lat: number; lng: number };
  destination: { lat: number; lng: number; name?: string } | null;
  capacity: number;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  estimatedCost: number | null;
  mapsUrl: string | null;
  stops: TripStopRecord[];
}

export interface TripRecord {
  id: string;
  /** "YYYY-MM-DD" */
  date: string;
  createdAt: string;
  routes: TripRouteRecord[];
}

/** Interface minima que os servicos usam para falar com o Google Maps — injetavel para testes. */
export interface GoogleMapsClient {
  getDistanceMatrix(params: {
    origins: Array<{ lat: number; lng: number }>;
    destinations: Array<{ lat: number; lng: number }>;
  }): Promise<{
    distanceMeters: (number | null)[][];
    durationSeconds: (number | null)[][];
  }>;
  getDirections(params: {
    origin: { lat: number; lng: number };
    destination: { lat: number; lng: number };
    waypoints: Array<{ lat: number; lng: number }>;
  }): Promise<{
    encodedPolyline: string;
    legs: DirectionsLeg[];
  }>;
  /** Resolve um endereco/CEP em coordenadas. Retorna null se nao encontrar nada. */
  geocodeAddress(query: string): Promise<GeocodeResult | null>;
}
