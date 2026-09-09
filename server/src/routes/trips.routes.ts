import { Router } from "express";
import { createTrip, deleteTrip, getTripById, listTrips, setTripStopBoarded } from "../store/tripStore";
import { parseTripRouteInput } from "../services/tripInput";
import { ValidationError } from "../middleware/errorHandler";
import { todayDateString } from "../utils/date";

export const tripsRouter = Router();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(v: unknown): v is string {
  return typeof v === "string" && DATE_RE.test(v);
}

/** Confirma a viagem atual (resultado ja exibido na tela) como historico permanente. */
tripsRouter.post("/", async (req, res, next) => {
  try {
    const { date, routes } = req.body ?? {};
    const tripDate = date !== undefined ? date : todayDateString();
    if (!isValidDate(tripDate)) {
      throw new ValidationError('date deve ser "YYYY-MM-DD"');
    }
    if (!Array.isArray(routes) || routes.length === 0) {
      throw new ValidationError("routes deve ser uma lista nao vazia");
    }

    const parsedRoutes = routes.map(parseTripRouteInput);
    const trip = await createTrip({ date: tripDate, routes: parsedRoutes });
    res.status(201).json(trip);
  } catch (err) {
    next(err);
  }
});

tripsRouter.get("/", async (req, res, next) => {
  try {
    const { date, from, to } = req.query;
    if (date !== undefined) {
      if (!isValidDate(date)) throw new ValidationError('date deve ser "YYYY-MM-DD"');
      res.json(await listTrips({ from: date as string, to: date as string }));
      return;
    }
    if (from !== undefined && !isValidDate(from)) throw new ValidationError('from deve ser "YYYY-MM-DD"');
    if (to !== undefined && !isValidDate(to)) throw new ValidationError('to deve ser "YYYY-MM-DD"');
    res.json(await listTrips({ from: from as string | undefined, to: to as string | undefined }));
  } catch (err) {
    next(err);
  }
});

tripsRouter.get("/:id", async (req, res, next) => {
  try {
    const trip = await getTripById(req.params.id);
    if (!trip) {
      res.status(404).json({ error: "Viagem nao encontrada" });
      return;
    }
    res.json(trip);
  } catch (err) {
    next(err);
  }
});

tripsRouter.patch("/:tripId/stops/:stopId", async (req, res, next) => {
  try {
    const { boarded } = req.body ?? {};
    if (boarded !== null && typeof boarded !== "boolean") {
      throw new ValidationError("boarded deve ser true, false ou null");
    }
    const updated = await setTripStopBoarded(req.params.stopId, boarded);
    if (!updated) {
      res.status(404).json({ error: "Parada nao encontrada" });
      return;
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

tripsRouter.delete("/:id", async (req, res, next) => {
  try {
    const existed = await deleteTrip(req.params.id);
    res.status(existed ? 204 : 404).end();
  } catch (err) {
    next(err);
  }
});
