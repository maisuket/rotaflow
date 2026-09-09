import { ErrorRequestHandler } from "express";
import { GoogleApiError } from "../services/googleMapsClient";

export class ValidationError extends Error {}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ValidationError) {
    res.status(400).json({ error: err.message });
    return;
  }
  if (err instanceof GoogleApiError) {
    res.status(502).json({ error: err.message, googleStatus: err.googleStatus });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Erro interno do servidor" });
};
