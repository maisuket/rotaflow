import express from "express";
import cors from "cors";
import { locationsRouter } from "./routes/locations.routes";
import { routesRouter } from "./routes/routes.routes";
import { optimizeRouter } from "./routes/optimize.routes";
import { geocodeRouter } from "./routes/geocode.routes";
import { destinationRouter } from "./routes/destination.routes";
import { autoOptimizeRouter } from "./routes/autoOptimize.routes";
import { settingsRouter } from "./routes/settings.routes";
import { diagnosticsRouter } from "./routes/diagnostics.routes";
import { tripsRouter } from "./routes/trips.routes";
import { driverRouter } from "./routes/driver.routes";
import { errorHandler } from "./middleware/errorHandler";
import { requireAuth } from "./middleware/auth";
import { expensiveLimiter, generalLimiter } from "./middleware/rateLimit";
import { env } from "./config/env";

export const app = express();

app.use(cors());
app.use(express.json());

// Publica de proposito: nao exige senha, so confirma que o servidor esta de pe
// (util pra diagnostico e pro frontend saber se precisa mostrar a tela de login).
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, hasApiKey: Boolean(env.googleMapsApiKey), authRequired: Boolean(env.appPassword) });
});

// Publica de proposito (montada ANTES do requireAuth abaixo): o link do
// motorista precisa funcionar sem a senha compartilhada do painel admin. O
// id da rota na URL e o proprio token de acesso — ver driver.routes.ts.
app.use("/api/driver", generalLimiter, driverRouter);

app.use("/api", generalLimiter);
app.use("/api", requireAuth);

app.use("/api/locations", locationsRouter);
app.use("/api/routes", routesRouter);
app.use("/api/optimize", expensiveLimiter, optimizeRouter);
app.use("/api/geocode", expensiveLimiter, geocodeRouter);
app.use("/api/destination", destinationRouter);
app.use("/api/auto-optimize", expensiveLimiter, autoOptimizeRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/diagnostics", expensiveLimiter, diagnosticsRouter);
app.use("/api/trips", tripsRouter);

app.use(errorHandler);
