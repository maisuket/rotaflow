import path from "path";
import fs from "fs";
import { PrismaClient } from "@prisma/client";

/**
 * O Prisma CLI resolve `file:` relativo (no schema.prisma) em relacao a
 * server/prisma/, mas o cliente em runtime resolveria em relacao ao CWD do
 * processo — sao coisas diferentes e e uma pegadinha classica do Prisma com
 * SQLite. Pra nao depender de qual CWD o servidor foi iniciado, SEMPRE
 * recalculamos um caminho absoluto quando a URL configurada e (ou seria) um
 * arquivo SQLite, garantindo que CLI (migracoes) e runtime apontem pro MESMO
 * arquivo (server/data/borabora.db).
 *
 * Quando DATABASE_URL for uma connection string de verdade (ex: Neon —
 * "postgresql://..."), isso e respeitado sem nenhuma interferencia daqui.
 */
const configuredUrl = process.env.DATABASE_URL;
if (!configuredUrl || configuredUrl.startsWith("file:")) {
  const DATA_DIR = path.join(__dirname, "..", "..", "data");
  fs.mkdirSync(DATA_DIR, { recursive: true });
  process.env.DATABASE_URL = `file:${path.join(DATA_DIR, "borabora.db")}`;
}

export const prisma = new PrismaClient();
