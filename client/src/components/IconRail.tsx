import type { ReactNode } from "react";

export type TabId = "rotas" | "locais" | "otimizar" | "embarque" | "relatorios";

interface TabDef {
  id: TabId;
  icon: string;
  label: string;
  hint: string;
}

export const TABS: TabDef[] = [
  { id: "rotas", icon: "🚐", label: "Rotas", hint: "Cadastre as rotas: origem, capacidade, motorista/veículo e dias da semana em que rodam." },
  { id: "locais", icon: "📍", label: "Locais", hint: "Cadastre os passageiros e seus pontos de embarque, um por um ou por planilha." },
  { id: "otimizar", icon: "⚡", label: "Otimizar", hint: "Calcule a ordem das paradas e confirme a viagem de hoje." },
  { id: "embarque", icon: "✅", label: "Embarque", hint: "Marque quem embarcou (ou faltou) numa viagem já confirmada." },
  { id: "relatorios", icon: "📊", label: "Relatórios", hint: "Km rodado, custo estimado e ocupação, a partir das viagens confirmadas." },
];

/**
 * Navegacao principal: trilha estreita de icones fixada na borda esquerda,
 * inspirada em ferramentas de despacho/roteirizacao (Onfleet, Circuit) — deixa
 * o mapa com muito mais espaco horizontal do que a antiga barra de abas dentro
 * de uma sidebar larga, e mantem a navegacao sempre visivel (nao rola com o
 * conteudo).
 */
export function IconRail({
  active,
  onChange,
  trailing,
}: {
  active: TabId;
  onChange: (id: TabId) => void;
  trailing?: ReactNode;
}) {
  return (
    <nav className="rail">
      <div className="rail-brand" title="BoraBora">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M12 2C7.6 2 4 5.6 4 10c0 6 8 12 8 12s8-6 8-12c0-4.4-3.6-8-8-8Z" fill="currentColor" />
          <circle cx="12" cy="10" r="3" fill="var(--color-primary)" />
        </svg>
      </div>
      <div className="rail-nav">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`rail-btn ${active === tab.id ? "active" : ""}`}
            onClick={() => onChange(tab.id)}
            title={tab.label}
          >
            <span className="rail-btn-icon">{tab.icon}</span>
            <span className="rail-btn-label">{tab.label}</span>
          </button>
        ))}
      </div>
      <div className="rail-bottom">{trailing}</div>
    </nav>
  );
}
