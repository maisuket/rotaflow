import { Router } from "express";
import { createGoogleMapsClient } from "../services/googleMapsClient";
import { env } from "../config/env";
import { ValidationError } from "../middleware/errorHandler";

export const geocodeRouter = Router();

geocodeRouter.get("/", async (req, res, next) => {
  try {
    const query = req.query.query;
    if (typeof query !== "string" || query.trim().length === 0) {
      throw new ValidationError("parametro 'query' e obrigatorio");
    }

    if (!env.googleMapsApiKey) {
      res.status(503).json({
        error:
          "GOOGLE_MAPS_API_KEY nao configurada no servidor. Defina em server/.env e reinicie.",
      });
      return;
    }

    const client = createGoogleMapsClient(env.googleMapsApiKey);
    const result = await client.geocodeAddress(query);

    if (!result) {
      res.status(404).json({ error: "Nenhum endereco encontrado para essa busca" });
      return;
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});
