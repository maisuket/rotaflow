import { Router } from "express";
import {
  createLocation,
  deleteLocation,
  getAllLocations,
} from "../store/locationsStore";
import { ValidationError } from "../middleware/errorHandler";
import { ImportRow, resolveImportRows } from "../services/csvImport";
import { createGoogleMapsClient } from "../services/googleMapsClient";
import { env } from "../config/env";
import { expensiveLimiter } from "../middleware/rateLimit";

export const locationsRouter = Router();

const MAX_IMPORT_ROWS = 300;

function isValidLat(v: unknown): v is number {
  return typeof v === "number" && v >= -90 && v <= 90;
}
function isValidLng(v: unknown): v is number {
  return typeof v === "number" && v >= -180 && v <= 180;
}

locationsRouter.get("/", async (_req, res, next) => {
  try {
    res.json(await getAllLocations());
  } catch (err) {
    next(err);
  }
});

locationsRouter.post("/", async (req, res, next) => {
  try {
    const { name, lat, lng, demand } = req.body ?? {};
    if (typeof name !== "string" || name.trim().length === 0) {
      throw new ValidationError("name e obrigatorio");
    }
    if (!isValidLat(lat)) throw new ValidationError("lat invalida (-90 a 90)");
    if (!isValidLng(lng)) throw new ValidationError("lng invalida (-180 a 180)");
    if (demand !== undefined && (!Number.isInteger(demand) || demand < 1)) {
      throw new ValidationError("demand deve ser um inteiro >= 1");
    }
    const location = await createLocation({ name, lat, lng, demand });
    res.status(201).json(location);
  } catch (err) {
    next(err);
  }
});

locationsRouter.post("/import", expensiveLimiter, async (req, res, next) => {
  try {
    const rawRows = req.body?.rows;
    if (!Array.isArray(rawRows) || rawRows.length === 0) {
      throw new ValidationError("rows deve ser uma lista nao vazia");
    }
    if (rawRows.length > MAX_IMPORT_ROWS) {
      throw new ValidationError(`Maximo de ${MAX_IMPORT_ROWS} linhas por importacao`);
    }

    const rows: ImportRow[] = rawRows.map((r: any) => ({
      name: typeof r?.name === "string" ? r.name : "",
      lat: typeof r?.lat === "number" ? r.lat : undefined,
      lng: typeof r?.lng === "number" ? r.lng : undefined,
      demand: typeof r?.demand === "number" ? r.demand : undefined,
      address: typeof r?.address === "string" ? r.address : undefined,
    }));

    const needsGeocoding = rows.some(
      (r) => r.address && !(typeof r.lat === "number" && typeof r.lng === "number")
    );

    if (needsGeocoding && !env.googleMapsApiKey) {
      res.status(503).json({
        error:
          "Algumas linhas usam endereco em vez de lat/lng, mas GOOGLE_MAPS_API_KEY nao esta configurada.",
      });
      return;
    }

    const client = needsGeocoding ? createGoogleMapsClient(env.googleMapsApiKey) : null;
    const geocode = async (address: string) => {
      const result = await client!.geocodeAddress(address);
      return result ? { lat: result.lat, lng: result.lng } : null;
    };

    const { toCreate, errors } = await resolveImportRows(rows, geocode);

    const created = [];
    for (const input of toCreate) {
      created.push(await createLocation(input));
    }

    res.json({ created, errors });
  } catch (err) {
    next(err);
  }
});

locationsRouter.delete("/:id", async (req, res, next) => {
  try {
    const existed = await deleteLocation(req.params.id);
    res.status(existed ? 204 : 404).end();
  } catch (err) {
    next(err);
  }
});
