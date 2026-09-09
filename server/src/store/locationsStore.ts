import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../db/client";
import { Location } from "../types";

function toLocation(row: {
  id: string;
  name: string;
  lat: number;
  lng: number;
  demand: number;
  createdAt: Date;
  updatedAt: Date;
}): Location {
  return {
    id: row.id,
    name: row.name,
    lat: row.lat,
    lng: row.lng,
    demand: row.demand,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getAllLocations(): Promise<Location[]> {
  const rows = await prisma.location.findMany();
  return rows.map(toLocation);
}

export interface CreateLocationInput {
  name: string;
  lat: number;
  lng: number;
  demand?: number;
}

export async function createLocation(input: CreateLocationInput): Promise<Location> {
  const row = await prisma.location.create({
    data: {
      id: randomUUID(),
      name: input.name,
      lat: input.lat,
      lng: input.lng,
      demand: input.demand ?? 1,
    },
  });
  return toLocation(row);
}

export async function deleteLocation(id: string): Promise<boolean> {
  try {
    await prisma.location.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return false;
    }
    throw err;
  }
}
