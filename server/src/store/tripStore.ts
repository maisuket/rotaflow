import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../db/client";
import { TripRecord, TripRouteRecord, TripStopRecord } from "../types";

const tripInclude = {
  routes: { include: { stops: { orderBy: { order: "asc" as const } } } },
} satisfies Prisma.TripInclude;

type TripRow = Prisma.TripGetPayload<{ include: typeof tripInclude }>;
type TripRouteRow = TripRow["routes"][number];
type TripStopRow = TripRouteRow["stops"][number];

export interface CreateTripRouteInput {
  routeId: string | null;
  routeName: string;
  driverName?: string | null;
  driverPhone?: string | null;
  vehiclePlate?: string | null;
  vehicleTypeLabel?: string | null;
  depot: { lat: number; lng: number };
  destination: { lat: number; lng: number; name?: string } | null;
  capacity: number;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  estimatedCost?: number | null;
  mapsUrl: string | null;
  stops: Array<{
    locationId: string | null;
    name: string;
    lat: number;
    lng: number;
    demand: number;
    order: number;
    etaSeconds?: number | null;
  }>;
}

export interface CreateTripInput {
  /** "YYYY-MM-DD" */
  date: string;
  routes: CreateTripRouteInput[];
}

export async function createTrip(input: CreateTripInput): Promise<TripRecord> {
  const tripId = randomUUID();
  await prisma.trip.create({
    data: {
      id: tripId,
      date: input.date,
      routes: {
        create: input.routes.map((r) => ({
          id: randomUUID(),
          routeId: r.routeId,
          routeName: r.routeName,
          driverName: r.driverName ?? null,
          driverPhone: r.driverPhone ?? null,
          vehiclePlate: r.vehiclePlate ?? null,
          vehicleTypeLabel: r.vehicleTypeLabel ?? null,
          depotLat: r.depot.lat,
          depotLng: r.depot.lng,
          destinationLat: r.destination?.lat ?? null,
          destinationLng: r.destination?.lng ?? null,
          destinationName: r.destination?.name ?? null,
          capacity: r.capacity,
          totalDistanceMeters: r.totalDistanceMeters,
          totalDurationSeconds: r.totalDurationSeconds,
          estimatedCost: r.estimatedCost ?? null,
          mapsUrl: r.mapsUrl,
          stops: {
            create: r.stops.map((s) => ({
              id: randomUUID(),
              locationId: s.locationId,
              name: s.name,
              lat: s.lat,
              lng: s.lng,
              demand: s.demand,
              order: s.order,
              etaSeconds: s.etaSeconds ?? null,
              boarded: null,
            })),
          },
        })),
      },
    },
  });
  return (await getTripById(tripId))!;
}

export async function getTripById(id: string): Promise<TripRecord | null> {
  const row = await prisma.trip.findUnique({ where: { id }, include: tripInclude });
  return row ? toTripRecord(row) : null;
}

export async function listTrips(filter: { from?: string; to?: string } = {}): Promise<TripRecord[]> {
  const rows = await prisma.trip.findMany({
    where: {
      date: {
        gte: filter.from,
        lte: filter.to,
      },
    },
    include: tripInclude,
    orderBy: { date: "desc" },
  });
  return rows.map(toTripRecord);
}

export async function deleteTrip(id: string): Promise<boolean> {
  try {
    await prisma.trip.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return false;
    }
    throw err;
  }
}

/** Retorna o stop atualizado, ou null se o id nao existir. */
export async function setTripStopBoarded(
  stopId: string,
  boarded: boolean | null
): Promise<TripStopRecord | null> {
  try {
    const row = await prisma.tripStop.update({ where: { id: stopId }, data: { boarded } });
    return toTripStopRecord(row);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return null;
    }
    throw err;
  }
}

function toTripStopRecord(row: TripStopRow): TripStopRecord {
  return {
    id: row.id,
    locationId: row.locationId,
    name: row.name,
    lat: row.lat,
    lng: row.lng,
    demand: row.demand,
    order: row.order,
    etaSeconds: row.etaSeconds,
    boarded: row.boarded,
  };
}

function toTripRouteRecord(row: TripRouteRow): TripRouteRecord {
  return {
    id: row.id,
    routeId: row.routeId,
    routeName: row.routeName,
    driverName: row.driverName,
    driverPhone: row.driverPhone,
    vehiclePlate: row.vehiclePlate,
    vehicleTypeLabel: row.vehicleTypeLabel,
    depot: { lat: row.depotLat, lng: row.depotLng },
    destination:
      row.destinationLat != null && row.destinationLng != null
        ? { lat: row.destinationLat, lng: row.destinationLng, name: row.destinationName ?? undefined }
        : null,
    capacity: row.capacity,
    totalDistanceMeters: row.totalDistanceMeters,
    totalDurationSeconds: row.totalDurationSeconds,
    estimatedCost: row.estimatedCost,
    mapsUrl: row.mapsUrl,
    stops: row.stops.map(toTripStopRecord),
  };
}

function toTripRecord(row: TripRow): TripRecord {
  return {
    id: row.id,
    date: row.date,
    createdAt: row.createdAt.toISOString(),
    routes: row.routes.map(toTripRouteRecord),
  };
}
