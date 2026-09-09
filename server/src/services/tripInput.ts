import { ValidationError } from "../middleware/errorHandler";
import { CreateTripRouteInput } from "../store/tripStore";

/**
 * Converte um item de `routes` recebido em `POST /api/trips` (o mesmo shape
 * de `OptimizedRouteResult` que o frontend ja tem na tela, ecoado de volta)
 * pro formato que `tripStore.createTrip` espera. Extraido do handler pra ser
 * testavel sem precisar de banco.
 */
export function parseTripRouteInput(raw: any, index: number): CreateTripRouteInput {
  if (typeof raw?.routeName !== "string" || raw.routeName.trim().length === 0) {
    throw new ValidationError(`routes[${index}].routeName e obrigatorio`);
  }
  if (typeof raw?.depot?.lat !== "number" || typeof raw?.depot?.lng !== "number") {
    throw new ValidationError(`routes[${index}].depot ({lat, lng}) e obrigatorio`);
  }
  if (!Array.isArray(raw?.stops)) {
    throw new ValidationError(`routes[${index}].stops deve ser uma lista`);
  }
  if (typeof raw?.totalDistanceMeters !== "number" || typeof raw?.totalDurationSeconds !== "number") {
    throw new ValidationError(`routes[${index}] precisa de totalDistanceMeters/totalDurationSeconds`);
  }

  return {
    routeId: typeof raw.routeId === "string" ? raw.routeId : null,
    routeName: raw.routeName,
    driverName: typeof raw.driverName === "string" ? raw.driverName : null,
    driverPhone: typeof raw.driverPhone === "string" ? raw.driverPhone : null,
    vehiclePlate: typeof raw.vehiclePlate === "string" ? raw.vehiclePlate : null,
    vehicleTypeLabel: typeof raw.vehicleTypeLabel === "string" ? raw.vehicleTypeLabel : null,
    depot: { lat: raw.depot.lat, lng: raw.depot.lng },
    destination:
      raw.destination && typeof raw.destination.lat === "number" && typeof raw.destination.lng === "number"
        ? { lat: raw.destination.lat, lng: raw.destination.lng, name: raw.destination.name }
        : null,
    capacity: typeof raw.capacity === "number" ? raw.capacity : 0,
    totalDistanceMeters: raw.totalDistanceMeters,
    totalDurationSeconds: raw.totalDurationSeconds,
    estimatedCost: typeof raw.estimatedCost === "number" ? raw.estimatedCost : null,
    mapsUrl: typeof raw.mapsUrl === "string" ? raw.mapsUrl : null,
    stops: raw.stops.map((s: any, i: number) => {
      if (typeof s?.name !== "string" || typeof s?.lat !== "number" || typeof s?.lng !== "number") {
        throw new ValidationError(`routes[${index}].stops[${i}] invalido`);
      }
      return {
        locationId: typeof s.locationId === "string" ? s.locationId : null,
        name: s.name,
        lat: s.lat,
        lng: s.lng,
        demand: typeof s.demand === "number" ? s.demand : 1,
        order: i + 1,
        etaSeconds: typeof s.etaSeconds === "number" ? s.etaSeconds : null,
      };
    }),
  };
}
