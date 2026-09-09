import { Router } from "express";
import { clearDestination, getDestination, setDestination } from "../store/destinationStore";
import { ValidationError } from "../middleware/errorHandler";

export const destinationRouter = Router();

function isValidLat(v: unknown): v is number {
  return typeof v === "number" && v >= -90 && v <= 90;
}
function isValidLng(v: unknown): v is number {
  return typeof v === "number" && v >= -180 && v <= 180;
}

destinationRouter.get("/", async (_req, res, next) => {
  try {
    res.json(await getDestination());
  } catch (err) {
    next(err);
  }
});

destinationRouter.put("/", async (req, res, next) => {
  try {
    const { name, lat, lng } = req.body ?? {};
    if (typeof name !== "string" || name.trim().length === 0) {
      throw new ValidationError("name e obrigatorio");
    }
    if (!isValidLat(lat)) throw new ValidationError("lat invalida (-90 a 90)");
    if (!isValidLng(lng)) throw new ValidationError("lng invalida (-180 a 180)");

    const destination = await setDestination({ name, lat, lng });
    res.json(destination);
  } catch (err) {
    next(err);
  }
});

destinationRouter.delete("/", async (_req, res, next) => {
  try {
    await clearDestination();
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
