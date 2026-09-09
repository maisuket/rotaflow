import { useState } from "react";
import { useAppState } from "../context/AppState";
import { OptimizeButton } from "./OptimizeButton";
import { AutoOptimizePanel } from "./AutoOptimizePanel";
import { ResultsPanel } from "./ResultsPanel";

type OptimizeMode = "manual" | "auto";

/**
 * Unifica os dois jeitos de otimizar (rotas cadastradas vs. calculo
 * automatico sem rotas fixas) numa unica decisao guiada, em vez de um botao
 * primario sempre visivel competindo com um painel secundario que o usuario
 * precisa lembrar de abrir. O modo inicial e sugerido a partir do que ja
 * esta cadastrado (tem rota? comeca em "rotas cadastradas"; senao, sugere o
 * automatico), mas o usuario pode trocar livremente.
 */
export function OptimizePanel() {
  const { routes, pendingOutliers } = useAppState();
  const [mode, setMode] = useState<OptimizeMode>(() => (routes.length > 0 ? "manual" : "auto"));

  // Uma decisao de outlier pendente exige o modo automatico ficar visivel ate
  // ser resolvida — nao da pra trocar de modo e "perder" um alerta que exige acao.
  const hasPendingDecision = pendingOutliers.length > 0;
  const effectiveMode: OptimizeMode = hasPendingDecision ? "auto" : mode;

  return (
    <div className="section">
      <div className="section-title">Como otimizar</div>

      <div className="mode-switch">
        <button
          type="button"
          className={`mode-switch-btn ${effectiveMode === "manual" ? "active" : ""}`}
          onClick={() => setMode("manual")}
          disabled={hasPendingDecision}
        >
          📋 Rotas cadastradas
        </button>
        <button
          type="button"
          className={`mode-switch-btn ${effectiveMode === "auto" ? "active" : ""}`}
          onClick={() => setMode("auto")}
          disabled={hasPendingDecision}
        >
          ⚡ Cálculo automático
        </button>
      </div>

      <p className="section-hint">
        {effectiveMode === "manual"
          ? "Usa as rotas já cadastradas (origem, capacidade, motorista) e calcula a melhor ordem de paradas em cada uma."
          : "Sem rotas pré-cadastradas — informe só as localizações e a capacidade por veículo; o sistema decide quantos veículos usar e a melhor origem para cada um."}
      </p>

      {effectiveMode === "manual" ? <OptimizeButton /> : <AutoOptimizePanel />}

      <ResultsPanel />
    </div>
  );
}
