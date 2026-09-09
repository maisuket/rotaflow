import { prisma } from "../db/client";
import { GlobalDestination } from "../types";

const SINGLETON_ID = 1;

export async function getDestination(): Promise<GlobalDestination | null> {
  const row = await prisma.destination.findUnique({ where: { id: SINGLETON_ID } });
  return row ? { name: row.name, lat: row.lat, lng: row.lng } : null;
}

export async function setDestination(input: GlobalDestination): Promise<GlobalDestination> {
  const row = await prisma.destination.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, ...input },
    update: { ...input },
  });
  return { name: row.name, lat: row.lat, lng: row.lng };
}

export async function clearDestination(): Promise<void> {
  await prisma.destination.deleteMany({ where: { id: SINGLETON_ID } });
}
