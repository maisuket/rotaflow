import { Router } from "express";
import { getSettings, setDepartureTime } from "../store/settingsStore";
import { ValidationError } from "../middleware/errorHandler";

export const settingsRouter = Router();

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

settingsRouter.get("/", async (_req, res, next) => {
  try {
    res.json(await getSettings());
  } catch (err) {
    next(err);
  }
});

settingsRouter.put("/", async (req, res, next) => {
  try {
    const { departureTime } = req.body ?? {};
    if (departureTime !== null && departureTime !== undefined) {
      if (typeof departureTime !== "string" || !TIME_PATTERN.test(departureTime)) {
        throw new ValidationError('departureTime deve ser "HH:MM" (24h) ou null');
      }
    }
    const settings = await setDepartureTime(departureTime ?? null);
    res.json(settings);
  } catch (err) {
    next(err);
  }
});
