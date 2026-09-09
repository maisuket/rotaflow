import { Router } from "express";
import { getAllLocations } from "../store/locationsStore";
import { getDestination } from "../store/destinationStore";
import { getSettings } from "../store/settingsStore";
import { runAutoOptimization } from "../services/autoOptimizePipeline";
import { createGoogleMapsClient } from "../services/googleMapsClient";
import { withCache } from "../services/cachedGoogleMapsClient";
import { env } from "../config/env";
import { ValidationError } from "../middleware/errorHandler";
import { OutlierDecision } from "../types";
import { timeStringToSeconds } from "../utils/time";

export const autoOptimizeRouter = Router();

autoOptimizeRouter.post("/", async (req, res, next) => {
  if (!env.googleMapsApiKey) {
    res.status(503).json({
      error:
        "GOOGLE_MAPS_API_KEY nao configurada no servidor. Defina em server/.env e reinicie.",
    });
    return;
  }

  try {
    const { capacityPerVehicle, outlierDecisions, lockedPositions: rawLockedPositions } =
      req.body ?? {};
    if (!Number.isInteger(capacityPerVehicle) || capacityPerVehicle < 1) {
      throw new ValidationError("capacityPerVehicle deve ser um inteiro >= 1");
    }

    const decisions: Record<string, OutlierDecision> = {};
    if (outlierDecisions && typeof outlierDecisions === "object") {
      for (const [id, value] of Object.entries(outlierDecisions)) {
        if (value === "dedicated" || value === "exclude") decisions[id] = value;
      }
    }

    const lockedPositions = new Map<string, "first" | "last">();
    if (rawLockedPositions && typeof rawLockedPositions === "object") {
      for (const [locationId, value] of Object.entries(rawLockedPositions)) {
        if (value === "first" || value === "last") lockedPositions.set(locationId, value);
      }
    }

    const [locations, destination, settings] = await Promise.all([
      getAllLocations(),
      getDestination(),
      getSettings(),
    ]);
    const client = withCache(createGoogleMapsClient(env.googleMapsApiKey));
    const result = await runAutoOptimization(
      locations,
      capacityPerVehicle,
      destination,
      decisions,
      client,
      timeStringToSeconds(settings.departureTime),
      lockedPositions
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});
