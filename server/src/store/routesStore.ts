import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../db/client";
import { RouteOriginMode, RouteVehicle } from "../types";

export async function getAllRoutes(): Promise<RouteVehicle[]> {
  const rows = await prisma.route.findMany();
  return rows.map(toRouteVehicle);
}

export interface CreateRouteInput {
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
  /** 0=domingo..6=sabado (Date.getDay()). Null/vazio = roda todo dia. */
  activeWeekdays?: number[] | null;
}

export async function createRoute(input: CreateRouteInput): Promise<RouteVehicle> {
  const row = await prisma.route.create({
    data: {
      id: randomUUID(),
      name: input.name,
      depotLat: input.depotLat,
      depotLng: input.depotLng,
      capacity: input.capacity,
      returnToDepot: input.returnToDepot ?? true,
      originMode: input.originMode ?? "depot",
      driverName: input.driverName ?? null,
      driverPhone: input.driverPhone ?? null,
      vehiclePlate: input.vehiclePlate ?? null,
      vehicleTypeLabel: input.vehicleTypeLabel ?? null,
      speedFactor: input.speedFactor ?? 1,
      costPerKm: input.costPerKm ?? 0,
      activeWeekdays: serializeWeekdays(input.activeWeekdays),
    },
  });
  return toRouteVehicle(row);
}

export async function deleteRoute(id: string): Promise<boolean> {
  try {
    await prisma.route.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return false;
    }
    throw err;
  }
}

export type UpdateRouteInput = Partial<CreateRouteInput>;

export async function updateRoute(id: string, patch: UpdateRouteInput): Promise<RouteVehicle | null> {
  const { activeWeekdays, ...rest } = patch;
  const data: Prisma.RouteUpdateInput = { ...rest };
  if (activeWeekdays !== undefined) {
    data.activeWeekdays = serializeWeekdays(activeWeekdays);
  }

  try {
    const row = await prisma.route.update({ where: { id }, data });
    return toRouteVehicle(row);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return null;
    }
    throw err;
  }
}

function serializeWeekdays(days: number[] | null | undefined): string | null {
  if (!days || days.length === 0) return null;
  return JSON.stringify([...new Set(days)].sort());
}

function parseWeekdays(raw: string | null): number[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((n): n is number => typeof n === "number") : null;
  } catch {
    return null;
  }
}

/** originMode e guardado como string livre no banco; normaliza pro union type. */
function toRouteVehicle(row: {
  id: string;
  name: string;
  depotLat: number;
  depotLng: number;
  capacity: number;
  returnToDepot: boolean;
  originMode: string;
  driverName: string | null;
  driverPhone: string | null;
  vehiclePlate: string | null;
  vehicleTypeLabel: string | null;
  speedFactor: number;
  costPerKm: number;
  activeWeekdays: string | null;
}): RouteVehicle {
  return {
    id: row.id,
    name: row.name,
    depotLat: row.depotLat,
    depotLng: row.depotLng,
    capacity: row.capacity,
    returnToDepot: row.returnToDepot,
    originMode: row.originMode === "firstPassenger" ? "firstPassenger" : "depot",
    driverName: row.driverName,
    driverPhone: row.driverPhone,
    vehiclePlate: row.vehiclePlate,
    vehicleTypeLabel: row.vehicleTypeLabel,
    speedFactor: row.speedFactor,
    costPerKm: row.costPerKm,
    activeWeekdays: parseWeekdays(row.activeWeekdays),
  };
}
