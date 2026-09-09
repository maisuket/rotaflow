import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { api, RouteVehicleFields } from "../api/client";
import {
  GlobalDestination,
  GlobalSettings,
  Location,
  OptimizeResponse,
  OutlierDecision,
  PendingOutlier,
  RouteOriginMode,
  RouteVehicle,
  TripRecord,
} from "../types";

export type LockPosition = "first" | "last";

/**
 * Identifica qual formulario pediu para escolher um ponto no mapa.
 * "location" / "destination" / "routeOrigin" sao os formularios de criacao;
 * `routeOriginEdit:<id>` identifica a edicao inline de uma rota especifica
 * (para nao conflitar com o formulario "Nova rota" quando ambos usam o mapa
 * ao mesmo tempo).
 */
export type PickTarget = "location" | "destination" | "routeOrigin" | `routeOriginEdit:${string}`;

/** Status observado do carregamento da Maps JavaScript API no navegador (chave client-side). */
export type GoogleMapsClientStatus = "unconfigured" | "loading" | "ok" | "error";

export interface PickedResult {
  target: PickTarget;
  lat: number;
  lng: number;
}

interface AppStateValue {
  locations: Location[];
  routes: RouteVehicle[];
  destination: GlobalDestination | null;
  result: OptimizeResponse | null;
  loading: boolean;
  error: string | null;
  addLocation: (input: {
    name: string;
    lat: number;
    lng: number;
    demand?: number;
  }) => Promise<void>;
  removeLocation: (id: string) => Promise<void>;
  importLocations: (
    rows: Array<{
      name: string;
      lat?: number;
      lng?: number;
      demand?: number;
      address?: string;
    }>
  ) => Promise<{ created: Location[]; errors: { row: number; message: string }[] } | null>;
  addRoute: (input: RouteVehicleFields) => Promise<void>;
  updateRoute: (id: string, patch: Partial<RouteVehicleFields>) => Promise<void>;
  removeRoute: (id: string) => Promise<void>;
  updateDestination: (input: { name: string; lat: number; lng: number }) => Promise<void>;
  settings: GlobalSettings;
  updateDepartureTime: (departureTime: string | null) => Promise<void>;
  optimize: () => Promise<void>;
  /** Forca uma localizacao (ex: uma que ficou sem rota) para uma rota especifica e reotimiza. */
  assignLocationToRoute: (locationId: string, routeId: string) => Promise<void>;
  /** Modo automatico: so localizacoes + capacidade por veiculo, sem rotas pre-cadastradas. */
  pendingOutliers: PendingOutlier[];
  runAutoOptimize: (capacityPerVehicle: number) => Promise<void>;
  decideOutlier: (locationId: string, decision: OutlierDecision) => Promise<void>;
  /** locationId -> "first" | "last": trava essa parada nessa posicao dentro da rota em que ela cair. */
  lockedPositions: Record<string, LockPosition>;
  setLockPosition: (locationId: string, position: LockPosition | null) => void;
  /**
   * Reordena manualmente 2 paradas de uma rota JA otimizada (ex: motorista
   * pediu pra trocar a ordem) e recalcula distancia/duracao/trajeto/ETA so
   * dessa rota, sem rodar o pipeline inteiro de novo.
   */
  reorderStop: (routeId: string, fromIndex: number, toIndex: number) => Promise<void>;
  /** Confirma o resultado atual (ja exibido na tela) como historico permanente — "YYYY-MM-DD", default hoje (util pra agendar/registrar outro dia). */
  confirmTrip: (date?: string) => Promise<TripRecord | null>;
  /** Quando nao-null, o proximo clique no mapa preenche `pickedResult` para este alvo. */
  pickMode: PickTarget | null;
  setPickMode: (target: PickTarget | null) => void;
  pickedResult: PickedResult | null;
  setPickedResult: (result: PickedResult | null) => void;
  /** Reportado pelo MapView, a partir do resultado real de carregar a Maps JavaScript API. */
  googleMapsClientStatus: GoogleMapsClientStatus;
  setGoogleMapsClientStatus: (status: GoogleMapsClientStatus) => void;
}

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [routes, setRoutes] = useState<RouteVehicle[]>([]);
  const [destination, setDestinationState] = useState<GlobalDestination | null>(null);
  const [settings, setSettings] = useState<GlobalSettings>({ departureTime: null });
  const [result, setResult] = useState<OptimizeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickMode, setPickMode] = useState<PickTarget | null>(null);
  const [pickedResult, setPickedResult] = useState<PickedResult | null>(null);
  const [googleMapsClientStatus, setGoogleMapsClientStatus] =
    useState<GoogleMapsClientStatus>("loading");
  const [pendingOutliers, setPendingOutliers] = useState<PendingOutlier[]>([]);
  const [forcedAssignments, setForcedAssignments] = useState<Record<string, string>>({});
  const [outlierDecisions, setOutlierDecisions] = useState<Record<string, OutlierDecision>>({});
  const [lastAutoCapacity, setLastAutoCapacity] = useState<number | null>(null);
  const [lockedPositions, setLockedPositions] = useState<Record<string, LockPosition>>({});

  const refresh = useCallback(async () => {
    const [locs, rts, dest, sett] = await Promise.all([
      api.getLocations(),
      api.getRoutes(),
      api.getDestination(),
      api.getSettings(),
    ]);
    setLocations(locs);
    setRoutes(rts);
    setDestinationState(dest);
    setSettings(sett);
  }, []);

  useEffect(() => {
    refresh().catch((err) => setError(String(err.message ?? err)));
  }, [refresh]);

  const withErrorHandling = useCallback(
    async (fn: () => Promise<void>) => {
      setError(null);
      try {
        await fn();
      } catch (err: any) {
        setError(err.message ?? String(err));
      }
    },
    []
  );

  const addLocation: AppStateValue["addLocation"] = async (input) => {
    await withErrorHandling(async () => {
      await api.createLocation(input);
      await refresh();
    });
  };

  const removeLocation: AppStateValue["removeLocation"] = async (id) => {
    await withErrorHandling(async () => {
      await api.deleteLocation(id);
      await refresh();
    });
  };

  const importLocations: AppStateValue["importLocations"] = async (rows) => {
    let outcome: { created: Location[]; errors: { row: number; message: string }[] } | null = null;
    await withErrorHandling(async () => {
      outcome = await api.importLocations(rows);
      await refresh();
    });
    return outcome;
  };

  const addRoute: AppStateValue["addRoute"] = async (input) => {
    await withErrorHandling(async () => {
      await api.createRoute(input);
      await refresh();
    });
  };

  const updateRoute: AppStateValue["updateRoute"] = async (id, patch) => {
    await withErrorHandling(async () => {
      await api.updateRoute(id, patch);
      await refresh();
    });
  };

  const removeRoute: AppStateValue["removeRoute"] = async (id) => {
    await withErrorHandling(async () => {
      await api.deleteRoute(id);
      await refresh();
    });
  };

  const updateDestination: AppStateValue["updateDestination"] = async (input) => {
    await withErrorHandling(async () => {
      await api.setDestination(input);
      await refresh();
    });
  };

  const updateDepartureTime: AppStateValue["updateDepartureTime"] = async (departureTime) => {
    await withErrorHandling(async () => {
      const sett = await api.setDepartureTime(departureTime);
      setSettings(sett);
    });
  };

  const optimize: AppStateValue["optimize"] = async () => {
    setLoading(true);
    await withErrorHandling(async () => {
      const res = await api.optimize({ forcedAssignments, lockedPositions });
      setResult(res);
      setPendingOutliers([]);
    });
    setLoading(false);
  };

  const assignLocationToRoute: AppStateValue["assignLocationToRoute"] = async (
    locationId,
    routeId
  ) => {
    const nextForced = { ...forcedAssignments, [locationId]: routeId };
    setForcedAssignments(nextForced);
    setLoading(true);
    await withErrorHandling(async () => {
      const res = await api.optimize({ forcedAssignments: nextForced, lockedPositions });
      setResult(res);
      setPendingOutliers([]);
    });
    setLoading(false);
  };

  const runAutoOptimize: AppStateValue["runAutoOptimize"] = async (capacityPerVehicle) => {
    setLoading(true);
    setLastAutoCapacity(capacityPerVehicle);
    await withErrorHandling(async () => {
      const res = await api.autoOptimize({ capacityPerVehicle, outlierDecisions, lockedPositions });
      setResult(res);
      setPendingOutliers(res.pendingOutliers);
    });
    setLoading(false);
  };

  const decideOutlier: AppStateValue["decideOutlier"] = async (locationId, decision) => {
    const nextDecisions = { ...outlierDecisions, [locationId]: decision };
    setOutlierDecisions(nextDecisions);
    if (lastAutoCapacity !== null) {
      setLoading(true);
      await withErrorHandling(async () => {
        const res = await api.autoOptimize({
          capacityPerVehicle: lastAutoCapacity,
          outlierDecisions: nextDecisions,
          lockedPositions,
        });
        setResult(res);
        setPendingOutliers(res.pendingOutliers);
      });
      setLoading(false);
    }
  };

  const setLockPosition: AppStateValue["setLockPosition"] = (locationId, position) => {
    setLockedPositions((prev) => {
      if (position === null) {
        const { [locationId]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [locationId]: position };
    });
  };

  const reorderStop: AppStateValue["reorderStop"] = async (routeId, fromIndex, toIndex) => {
    if (!result) return;
    const routeResult = result.routes.find((r) => r.routeId === routeId);
    if (!routeResult) return;

    const orderedLocationIds = routeResult.stops.map((s) => s.locationId);
    const [moved] = orderedLocationIds.splice(fromIndex, 1);
    orderedLocationIds.splice(toIndex, 0, moved);

    const dbRoute = routes.find((r) => r.id === routeId);
    const originMode: RouteOriginMode = dbRoute ? dbRoute.originMode : "firstPassenger";
    const depot = dbRoute ? { lat: dbRoute.depotLat, lng: dbRoute.depotLng } : undefined;
    const returnToDepot = dbRoute ? dbRoute.returnToDepot : false;

    setLoading(true);
    await withErrorHandling(async () => {
      const updatedRoute = await api.manualOrder({
        routeId,
        routeName: routeResult.routeName,
        orderedLocationIds,
        originMode,
        depot,
        returnToDepot,
        // Preserva motorista/veiculo/capacidade/custo ja exibidos (reordenar nao muda nenhum disso) —
        // prioriza a rota cadastrada (fonte viva) e cai pro que ja estava no resultado como fallback
        // (rotas do modo automatico nao existem em `routes`).
        capacity: dbRoute?.capacity ?? routeResult.capacity,
        driverName: dbRoute?.driverName ?? routeResult.driverName,
        driverPhone: dbRoute?.driverPhone ?? routeResult.driverPhone,
        vehiclePlate: dbRoute?.vehiclePlate ?? routeResult.vehiclePlate,
        vehicleTypeLabel: dbRoute?.vehicleTypeLabel ?? routeResult.vehicleTypeLabel,
        speedFactor: dbRoute?.speedFactor ?? 1,
        costPerKm: dbRoute?.costPerKm ?? 0,
      });
      setResult({
        ...result,
        routes: result.routes.map((r) => (r.routeId === routeId ? updatedRoute : r)),
      });
    });
    setLoading(false);
  };

  const confirmTrip: AppStateValue["confirmTrip"] = async (date) => {
    if (!result || result.routes.length === 0) return null;
    let trip: TripRecord | null = null;
    await withErrorHandling(async () => {
      trip = await api.confirmTrip({ date, routes: result.routes });
    });
    return trip;
  };

  return (
    <AppStateContext.Provider
      value={{
        locations,
        routes,
        destination,
        result,
        loading,
        error,
        addLocation,
        removeLocation,
        importLocations,
        addRoute,
        updateRoute,
        removeRoute,
        updateDestination,
        settings,
        updateDepartureTime,
        optimize,
        assignLocationToRoute,
        pendingOutliers,
        runAutoOptimize,
        decideOutlier,
        lockedPositions,
        setLockPosition,
        reorderStop,
        confirmTrip,
        pickMode,
        setPickMode,
        pickedResult,
        setPickedResult,
        googleMapsClientStatus,
        setGoogleMapsClientStatus,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState deve ser usado dentro de AppStateProvider");
  return ctx;
}
