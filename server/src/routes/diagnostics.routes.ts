import { Router } from "express";
import { env } from "../config/env";
import { createGoogleMapsClient } from "../services/googleMapsClient";
import { checkGoogleDiagnostics } from "../services/diagnostics";

export const diagnosticsRouter = Router();

diagnosticsRouter.get("/google", async (_req, res, next) => {
  try {
    const result = await checkGoogleDiagnostics(env.googleMapsApiKey, createGoogleMapsClient);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
