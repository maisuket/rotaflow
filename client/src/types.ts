export interface Location {
  id: string;
  name: string;
  lat: number;
  lng: number;
  demand: number;
  /** ISO 8601. */
  createdAt?: string;
  updatedAt?: string;
}

export type RouteOriginMode = "depot" | "firstPassenger";

export interface RouteVehicle {
  id: string;
  name: string;
  depotLat: number;
  depotLng: number;
  capacity: number;
  returnToDepot: boolean;
  originMode: RouteOriginMode;
  driverName: string | null;
  driverPhone: string | null;
  vehiclePlate: string | null;
  vehicleTypeLabel: string | null;
  /** Multiplicador de duracao/ETA (1 = normal, >1 = mais lento). Nao afeta distancia. */
  speedFactor: number;
  /** Custo estimado por km — so exibicao/relatorio. */
  costPerKm: number;
  /** Dias da semana em que a rota roda (0=domingo..6=sabado). Null = roda todo dia. */
  activeWeekdays: number[] | null;
  /** ISO 8601. */
  createdAt?: string;
  updatedAt?: string;
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
  /** Segundos desde a meia-noite, estimativa de chegada (so com horario de partida configurado). */
  etaSeconds?: number;
}

export interface OptimizedRouteResult {
  routeId: string;
  routeName: string;
  depot: { lat: number; lng: number };
  destination: { lat: number; lng: number; name?: string } | null;
  stops: OptimizedStop[];
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  directions: DirectionsInfo;
  /** Segundos desde a meia-noite, chegada estimada no ponto final. */
  finalArrivalSeconds?: number;
  /** Link publico do Google Maps com o trajeto ja na ordem calculada. Null se a rota nao tem paradas. */
  mapsUrl: string | null;
  capacity: number;
  driverName?: string | null;
  driverPhone?: string | null;
  vehiclePlate?: string | null;
  vehicleTypeLabel?: string | null;
  estimatedCost?: number;
}

export interface GlobalSettings {
  /** "HH:MM" (24h) ou null. */
  departureTime: string | null;
}

export interface GlobalDestination {
  lat: number;
  lng: number;
  name: string;
}

export interface OptimizeResponse {
  routes: OptimizedRouteResult[];
  unassignedLocationIds: string[];
  generatedAt: string;
  /** Rotas cadastradas que ficaram de fora desta otimizacao por recorrencia semanal (nao ativas hoje). */
  inactiveRouteIds?: string[];
}

export interface PendingOutlier {
  locationId: string;
  name: string;
  nearestDistanceMeters: number;
  nearestLocationName: string;
}

export type OutlierDecision = "dedicated" | "exclude";

export interface AutoOptimizeResponse {
  routes: OptimizedRouteResult[];
  unassignedLocationIds: string[];
  pendingOutliers: PendingOutlier[];
  generatedAt: string;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

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
