import { prisma } from "../db/client";
import { GlobalSettings } from "../types";

const SINGLETON_ID = 1;

export async function getSettings(): Promise<GlobalSettings> {
  const row = await prisma.settings.findUnique({ where: { id: SINGLETON_ID } });
  return { departureTime: row?.departureTime ?? null };
}

export async function setDepartureTime(departureTime: string | null): Promise<GlobalSettings> {
  const row = await prisma.settings.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, departureTime },
    update: { departureTime },
  });
  return { departureTime: row.departureTime };
}
