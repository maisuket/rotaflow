import { Router } from "express";
import { getAllLocations } from "../store/locationsStore";
import { getAllRoutes } from "../store/routesStore";
import { getDestination } from "../store/destinationStore";
import { getSettings } from "../store/settingsStore";
import { runOptimization } from "../services/optimizePipeline";
import { createGoogleMapsClient } from "../services/googleMapsClient";
import { withCache } from "../services/cachedGoogleMapsClient";
import { env } from "../config/env";
import { timeStringToSeconds } from "../utils/time";
import { isRouteActiveOnWeekday } from "../utils/recurrence";

export const optimizeRouter = Router();

optimizeRouter.post("/", async (req, res, next) => {
  if (!env.googleMapsApiKey) {
    res.status(503).json({
      error:
        "GOOGLE_MAPS_API_KEY nao configurada no servidor. Defina em server/.env e reinicie.",
    });
    return;
  }

  try {
    const forcedAssignments = new Map<string, string>();
    const rawForced = req.body?.forcedAssignments;
    if (rawForced && typeof rawForced === "object") {
      for (const [locationId, routeId] of Object.entries(rawForced)) {
        if (typeof routeId === "string") forcedAssignments.set(locationId, routeId);
      }
    }

    const lockedPositions = new Map<string, "first" | "last">();
    const rawLockedPositions = req.body?.lockedPositions;
    if (rawLockedPositions && typeof rawLockedPositions === "object") {
      for (const [locationId, value] of Object.entries(rawLockedPositions)) {
        if (value === "first" || value === "last") lockedPositions.set(locationId, value);
      }
    }

    const [locations, allRoutes, destination, settings] = await Promise.all([
      getAllLocations(),
      getAllRoutes(),
      getDestination(),
      getSettings(),
    ]);

    const today = new Date().getDay();
    const activeRoutes = allRoutes.filter((r) => isRouteActiveOnWeekday(r, today));
    const inactiveRouteIds = allRoutes
      .filter((r) => !isRouteActiveOnWeekday(r, today))
      .map((r) => r.id);

    const client = withCache(createGoogleMapsClient(env.googleMapsApiKey));
    const result = await runOptimization(
      locations,
      activeRoutes,
      client,
      destination,
      forcedAssignments,
      timeStringToSeconds(settings.departureTime),
      lockedPositions
    );
    res.json({ ...result, inactiveRouteIds });
  } catch (err) {
    next(err);
  }
});
