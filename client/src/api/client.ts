import {
  AutoOptimizeResponse,
  DriverRouteView,
  GeocodeResult,
  GlobalDestination,
  GlobalSettings,
  Location,
  OptimizeResponse,
  OptimizedRouteResult,
  OutlierDecision,
  RouteOriginMode,
  RouteVehicle,
  TripRecord,
  TripStopRecord,
} from "../types";
import { getAuthToken } from "./authToken";

export interface RouteVehicleFields {
  name: string;
  depotLat: number;
  depotLng: number;
  capacity: number;
  returnToDepot?: boolean;
  originMode?: RouteOriginMode;
  driverName?: string | null;
  driverPhone?: string | null;
  vehiclePlate?: string | null;
  vehicleTypeLabel?: string | null;
  speedFactor?: number;
  costPerKm?: number;
  /** 0=domingo..6=sabado. Null/undefined = roda todo dia. */
  activeWeekdays?: number[] | null;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(`/api${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.error ?? `Erro HTTP ${res.status}`, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  getLocations: () => request<Location[]>("/locations"),
  createLocation: (input: {
    name: string;
    lat: number;
    lng: number;
    demand?: number;
  }) =>
    request<Location>("/locations", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  deleteLocation: (id: string) =>
    request<void>(`/locations/${id}`, { method: "DELETE" }),
  importLocations: (
    rows: Array<{
      name: string;
      lat?: number;
      lng?: number;
      demand?: number;
      address?: string;
    }>
  ) =>
    request<{ created: Location[]; errors: { row: number; message: string }[] }>(
      "/locations/import",
      {
        method: "POST",
        body: JSON.stringify({ rows }),
      }
    ),

  getRoutes: () => request<RouteVehicle[]>("/routes"),
  createRoute: (input: RouteVehicleFields) =>
    request<RouteVehicle>("/routes", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateRoute: (id: string, patch: Partial<RouteVehicleFields>) =>
    request<RouteVehicle>(`/routes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  deleteRoute: (id: string) =>
    request<void>(`/routes/${id}`, { method: "DELETE" }),
  manualOrder: (input: {
    routeId: string;
    routeName: string;
    orderedLocationIds: string[];
    originMode: RouteOriginMode;
    depot?: { lat: number; lng: number };
    returnToDepot?: boolean;
    capacity?: number;
    driverName?: string | null;
    driverPhone?: string | null;
    vehiclePlate?: string | null;
    vehicleTypeLabel?: string | null;
    speedFactor?: number;
    costPerKm?: number;
  }) =>
    request<OptimizedRouteResult>("/routes/manual-order", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  getDestination: () => request<GlobalDestination | null>("/destination"),
  setDestination: (input: { name: string; lat: number; lng: number }) =>
    request<GlobalDestination>("/destination", {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  clearDestination: () => request<void>("/destination", { method: "DELETE" }),

  getSettings: () => request<GlobalSettings>("/settings"),
  setDepartureTime: (departureTime: string | null) =>
    request<GlobalSettings>("/settings", {
      method: "PUT",
      body: JSON.stringify({ departureTime }),
    }),

  optimize: (input?: {
    forcedAssignments?: Record<string, string>;
    lockedPositions?: Record<string, "first" | "last">;
  }) =>
    request<OptimizeResponse>("/optimize", {
      method: "POST",
      body: JSON.stringify(input ?? {}),
    }),

  autoOptimize: (input: {
    capacityPerVehicle: number;
    outlierDecisions?: Record<string, OutlierDecision>;
    lockedPositions?: Record<string, "first" | "last">;
  }) =>
    request<AutoOptimizeResponse>("/auto-optimize", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  geocode: (query: string) =>
    request<GeocodeResult>(`/geocode?query=${encodeURIComponent(query)}`),

  health: () =>
    request<{ ok: boolean; hasApiKey: boolean; authRequired: boolean }>("/health"),

  getGoogleDiagnostics: () =>
    request<{
      serverKeyConfigured: boolean;
      distanceMatrix: { checked: boolean; ok: boolean; error: string | null };
    }>("/diagnostics/google"),

  confirmTrip: (input: { date?: string; routes: OptimizedRouteResult[] }) =>
    request<TripRecord>("/trips", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  getTrips: (params?: { date?: string; from?: string; to?: string }) => {
    const query = new URLSearchParams();
    if (params?.date) query.set("date", params.date);
    if (params?.from) query.set("from", params.from);
    if (params?.to) query.set("to", params.to);
    const qs = query.toString();
    return request<TripRecord[]>(`/trips${qs ? `?${qs}` : ""}`);
  },
  getTrip: (id: string) => request<TripRecord>(`/trips/${id}`),
  setTripStopBoarded: (tripId: string, stopId: string, boarded: boolean | null) =>
    request<TripStopRecord>(`/trips/${tripId}/stops/${stopId}`, {
      method: "PATCH",
      body: JSON.stringify({ boarded }),
    }),
  deleteTrip: (id: string) => request<void>(`/trips/${id}`, { method: "DELETE" }),

  // Publicas de proposito (sem senha) — usadas pelo link do motorista.
  getDriverRoute: (tripRouteId: string) =>
    request<DriverRouteView>(`/driver/${tripRouteId}`),
  setDriverStopBoarded: (tripRouteId: string, stopId: string, boarded: boolean | null) =>
    request<TripStopRecord>(`/driver/${tripRouteId}/stops/${stopId}`, {
      method: "PATCH",
      body: JSON.stringify({ boarded }),
    }),
};
