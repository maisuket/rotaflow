import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../db/client";
import { Location } from "../types";

export async function getAllLocations(): Promise<Location[]> {
  return prisma.location.findMany();
}

export interface CreateLocationInput {
  name: string;
  lat: number;
  lng: number;
  demand?: number;
}

export async function createLocation(input: CreateLocationInput): Promise<Location> {
  return prisma.location.create({
    data: {
      id: randomUUID(),
      name: input.name,
      lat: input.lat,
      lng: input.lng,
      demand: input.demand ?? 1,
    },
  });
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
