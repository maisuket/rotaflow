import { Router } from "express";
import { getTripRouteForDriver, setDriverStopBoarded } from "../store/tripStore";
import { ValidationError } from "../middleware/errorHandler";

/**
 * Rotas PUBLICAS de proposito (montadas antes do `requireAuth` em app.ts) —
 * o link do motorista precisa funcionar sem a senha compartilhada do painel
 * admin. O `tripRouteId` na URL funciona como o proprio token: e um UUID
 * gerado na confirmacao da viagem, nao adivinhavel, e da acesso só aquela
 * rota especifica (nunca as outras rotas da mesma viagem).
 */
export const driverRouter = Router();

driverRouter.get("/:tripRouteId", async (req, res, next) => {
  try {
    const view = await getTripRouteForDriver(req.params.tripRouteId);
    if (!view) {
      res.status(404).json({ error: "Link inválido." });
      return;
    }
    res.json(view);
  } catch (err) {
    next(err);
  }
});

driverRouter.patch("/:tripRouteId/stops/:stopId", async (req, res, next) => {
  try {
    const { boarded } = req.body ?? {};
    if (boarded !== null && typeof boarded !== "boolean") {
      throw new ValidationError("boarded deve ser true, false ou null");
    }
    const updated = await setDriverStopBoarded(req.params.tripRouteId, req.params.stopId, boarded);
    if (!updated) {
      res.status(404).json({ error: "Parada não encontrada." });
      return;
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});
