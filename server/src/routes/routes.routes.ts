import { Router } from "express";
import {
  createRoute,
  deleteRoute,
  getAllRoutes,
  updateRoute,
  UpdateRouteInput,
} from "../store/routesStore";
import { getAllLocations } from "../store/locationsStore";
import { getDestination } from "../store/destinationStore";
import { getSettings } from "../store/settingsStore";
import { ValidationError } from "../middleware/errorHandler";
import { RouteOriginMode, RouteVehicle } from "../types";
import { computeManualOrderResult } from "../services/manualReorder";
import { createGoogleMapsClient } from "../services/googleMapsClient";
import { expensiveLimiter } from "../middleware/rateLimit";
import { env } from "../config/env";
import { timeStringToSeconds } from "../utils/time";

export const routesRouter = Router();

function isValidLat(v: unknown): v is number {
  return typeof v === "number" && v >= -90 && v <= 90;
}
function isValidLng(v: unknown): v is number {
  return typeof v === "number" && v >= -180 && v <= 180;
}
function isValidOriginMode(v: unknown): v is RouteOriginMode {
  return v === "depot" || v === "firstPassenger";
}
function isNullableString(v: unknown): v is string | null | undefined {
  return v === undefined || v === null || typeof v === "string";
}
function isValidWeekdays(v: unknown): v is number[] | null | undefined {
  if (v === undefined || v === null) return true;
  return Array.isArray(v) && v.every((n) => Number.isInteger(n) && n >= 0 && n <= 6);
}

routesRouter.get("/", async (_req, res, next) => {
  try {
    res.json(await getAllRoutes());
  } catch (err) {
    next(err);
  }
});

routesRouter.post("/", async (req, res, next) => {
  try {
    const {
      name,
      depotLat,
      depotLng,
      capacity,
      returnToDepot,
      originMode,
      driverName,
      driverPhone,
      vehiclePlate,
      vehicleTypeLabel,
      speedFactor,
      costPerKm,
      activeWeekdays,
    } = req.body ?? {};
    if (typeof name !== "string" || name.trim().length === 0) {
      throw new ValidationError("name e obrigatorio");
    }
    if (!isValidLat(depotLat)) throw new ValidationError("depotLat invalida (-90 a 90)");
    if (!isValidLng(depotLng)) throw new ValidationError("depotLng invalida (-180 a 180)");
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new ValidationError("capacity deve ser um inteiro >= 1");
    }
    if (returnToDepot !== undefined && typeof returnToDepot !== "boolean") {
      throw new ValidationError("returnToDepot deve ser boolean");
    }
    if (originMode !== undefined && !isValidOriginMode(originMode)) {
      throw new ValidationError('originMode deve ser "depot" ou "firstPassenger"');
    }
    if (!isNullableString(driverName)) throw new ValidationError("driverName deve ser string ou null");
    if (!isNullableString(driverPhone)) throw new ValidationError("driverPhone deve ser string ou null");
    if (!isNullableString(vehiclePlate)) throw new ValidationError("vehiclePlate deve ser string ou null");
    if (!isNullableString(vehicleTypeLabel)) {
      throw new ValidationError("vehicleTypeLabel deve ser string ou null");
    }
    if (speedFactor !== undefined && (typeof speedFactor !== "number" || speedFactor <= 0)) {
      throw new ValidationError("speedFactor deve ser um numero > 0");
    }
    if (costPerKm !== undefined && (typeof costPerKm !== "number" || costPerKm < 0)) {
      throw new ValidationError("costPerKm deve ser um numero >= 0");
    }
    if (!isValidWeekdays(activeWeekdays)) {
      throw new ValidationError("activeWeekdays deve ser uma lista de inteiros 0-6");
    }
    const route = await createRoute({
      name,
      depotLat,
      depotLng,
      capacity,
      returnToDepot,
      originMode,
      driverName,
      driverPhone,
      vehiclePlate,
      vehicleTypeLabel,
      speedFactor,
      costPerKm,
      activeWeekdays,
    });
    res.status(201).json(route);
  } catch (err) {
    next(err);
  }
});

routesRouter.patch("/:id", async (req, res, next) => {
  try {
    const {
      name,
      depotLat,
      depotLng,
      capacity,
      returnToDepot,
      originMode,
      driverName,
      driverPhone,
      vehiclePlate,
      vehicleTypeLabel,
      speedFactor,
      costPerKm,
      activeWeekdays,
    } = req.body ?? {};
    const patch: UpdateRouteInput = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        throw new ValidationError("name invalido");
      }
      patch.name = name;
    }
    if (depotLat !== undefined) {
      if (!isValidLat(depotLat)) throw new ValidationError("depotLat invalida (-90 a 90)");
      patch.depotLat = depotLat;
    }
    if (depotLng !== undefined) {
      if (!isValidLng(depotLng)) throw new ValidationError("depotLng invalida (-180 a 180)");
      patch.depotLng = depotLng;
    }
    if (capacity !== undefined) {
      if (!Number.isInteger(capacity) || capacity < 1) {
        throw new ValidationError("capacity deve ser um inteiro >= 1");
      }
      patch.capacity = capacity;
    }
    if (returnToDepot !== undefined) {
      if (typeof returnToDepot !== "boolean") {
        throw new ValidationError("returnToDepot deve ser boolean");
      }
      patch.returnToDepot = returnToDepot;
    }
    if (originMode !== undefined) {
      if (!isValidOriginMode(originMode)) {
        throw new ValidationError('originMode deve ser "depot" ou "firstPassenger"');
      }
      patch.originMode = originMode;
    }
    if (driverName !== undefined) {
      if (!isNullableString(driverName)) throw new ValidationError("driverName deve ser string ou null");
      patch.driverName = driverName;
    }
    if (driverPhone !== undefined) {
      if (!isNullableString(driverPhone)) throw new ValidationError("driverPhone deve ser string ou null");
      patch.driverPhone = driverPhone;
    }
    if (vehiclePlate !== undefined) {
      if (!isNullableString(vehiclePlate)) throw new ValidationError("vehiclePlate deve ser string ou null");
      patch.vehiclePlate = vehiclePlate;
    }
    if (vehicleTypeLabel !== undefined) {
      if (!isNullableString(vehicleTypeLabel)) {
        throw new ValidationError("vehicleTypeLabel deve ser string ou null");
      }
      patch.vehicleTypeLabel = vehicleTypeLabel;
    }
    if (speedFactor !== undefined) {
      if (typeof speedFactor !== "number" || speedFactor <= 0) {
        throw new ValidationError("speedFactor deve ser um numero > 0");
      }
      patch.speedFactor = speedFactor;
    }
    if (costPerKm !== undefined) {
      if (typeof costPerKm !== "number" || costPerKm < 0) {
        throw new ValidationError("costPerKm deve ser um numero >= 0");
      }
      patch.costPerKm = costPerKm;
    }
    if (activeWeekdays !== undefined) {
      if (!isValidWeekdays(activeWeekdays)) {
        throw new ValidationError("activeWeekdays deve ser uma lista de inteiros 0-6");
      }
      patch.activeWeekdays = activeWeekdays;
    }

    const updated = await updateRoute(req.params.id, patch);
    if (!updated) {
      res.status(404).json({ error: "Rota nao encontrada" });
      return;
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

/**
 * Recalcula distancia/duracao/trajeto/ETA de UMA rota para uma ordem de
 * paradas escolhida manualmente (o usuario arrastou/reordenou na tela de
 * resultado). Nao muda quem esta na rota, so a ordem de visita — por isso
 * nao precisa (nem tenta) validar capacidade de novo.
 *
 * `routeId`/`routeName` sao so ecoados de volta na resposta (nao ha consulta
 * ao banco por id) — isso permite reordenar tanto rotas cadastradas quanto
 * rotas sinteticas do modo automatico (`auto-N-<locationId>`), que nao
 * existem na tabela de rotas.
 */
routesRouter.post("/manual-order", expensiveLimiter, async (req, res, next) => {
  if (!env.googleMapsApiKey) {
    res.status(503).json({
      error: "GOOGLE_MAPS_API_KEY nao configurada no servidor. Defina em server/.env e reinicie.",
    });
    return;
  }

  try {
    const {
      routeId,
      routeName,
      orderedLocationIds,
      originMode,
      depot,
      returnToDepot,
      capacity,
      driverName,
      driverPhone,
      vehiclePlate,
      vehicleTypeLabel,
      speedFactor,
      costPerKm,
    } = req.body ?? {};

    if (typeof routeId !== "string" || routeId.trim().length === 0) {
      throw new ValidationError("routeId e obrigatorio");
    }
    if (typeof routeName !== "string" || routeName.trim().length === 0) {
      throw new ValidationError("routeName e obrigatorio");
    }
    if (!Array.isArray(orderedLocationIds) || orderedLocationIds.length === 0) {
      throw new ValidationError("orderedLocationIds deve ser uma lista nao vazia");
    }
    if (!isValidOriginMode(originMode)) {
      throw new ValidationError('originMode deve ser "depot" ou "firstPassenger"');
    }
    if (originMode === "depot") {
      if (!depot || !isValidLat(depot.lat) || !isValidLng(depot.lng)) {
        throw new ValidationError("depot ({lat, lng}) e obrigatorio quando originMode = depot");
      }
    }
    if (returnToDepot !== undefined && typeof returnToDepot !== "boolean") {
      throw new ValidationError("returnToDepot deve ser boolean");
    }
    if (speedFactor !== undefined && (typeof speedFactor !== "number" || speedFactor <= 0)) {
      throw new ValidationError("speedFactor deve ser um numero > 0");
    }
    if (costPerKm !== undefined && (typeof costPerKm !== "number" || costPerKm < 0)) {
      throw new ValidationError("costPerKm deve ser um numero >= 0");
    }

    const allLocations = await getAllLocations();
    const locationById = new Map(allLocations.map((l) => [l.id, l]));
    const orderedLocations = orderedLocationIds.map((id: unknown) => {
      if (typeof id !== "string" || !locationById.has(id)) {
        throw new ValidationError(`Localizacao desconhecida: ${String(id)}`);
      }
      return locationById.get(id)!;
    });

    const [destination, settings] = await Promise.all([getDestination(), getSettings()]);

    const routeLike: RouteVehicle = {
      id: routeId,
      name: routeName,
      depotLat: originMode === "depot" ? depot.lat : 0,
      depotLng: originMode === "depot" ? depot.lng : 0,
      capacity: Number.isInteger(capacity) ? capacity : 0,
      returnToDepot: Boolean(returnToDepot),
      originMode,
      driverName: isNullableString(driverName) ? driverName ?? null : null,
      driverPhone: isNullableString(driverPhone) ? driverPhone ?? null : null,
      vehiclePlate: isNullableString(vehiclePlate) ? vehiclePlate ?? null : null,
      vehicleTypeLabel: isNullableString(vehicleTypeLabel) ? vehicleTypeLabel ?? null : null,
      speedFactor: typeof speedFactor === "number" ? speedFactor : 1,
      costPerKm: typeof costPerKm === "number" ? costPerKm : 0,
      activeWeekdays: null,
    };

    const client = createGoogleMapsClient(env.googleMapsApiKey);
    const result = await computeManualOrderResult(
      routeLike,
      orderedLocations,
      destination,
      timeStringToSeconds(settings.departureTime),
      client
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
});

routesRouter.delete("/:id", async (req, res, next) => {
  try {
    const existed = await deleteRoute(req.params.id);
    res.status(existed ? 204 : 404).end();
  } catch (err) {
    next(err);
  }
});
