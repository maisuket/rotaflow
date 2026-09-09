export type TabId = "rotas" | "locais" | "otimizar" | "embarque" | "relatorios";

interface TabDef {
  id: TabId;
  icon: string;
  label: string;
  hint: string;
}

const TABS: TabDef[] = [
  { id: "rotas", icon: "🚐", label: "Rotas", hint: "Cadastre as rotas: origem, capacidade, motorista/veículo e dias da semana em que rodam." },
  { id: "locais", icon: "📍", label: "Locais", hint: "Cadastre os passageiros e seus pontos de embarque, um por um ou por planilha." },
  { id: "otimizar", icon: "⚡", label: "Otimizar", hint: "Calcule a ordem das paradas e confirme a viagem de hoje." },
  { id: "embarque", icon: "✅", label: "Embarque", hint: "Marque quem embarcou (ou faltou) numa viagem já confirmada." },
  { id: "relatorios", icon: "📊", label: "Relatórios", hint: "Km rodado, custo estimado e ocupação, a partir das viagens confirmadas." },
];

export function TabBar({ active, onChange }: { active: TabId; onChange: (id: TabId) => void }) {
  const activeTab = TABS.find((t) => t.id === active);
  return (
    <>
      <div className="tab-bar">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`tab-btn ${active === tab.id ? "active" : ""}`}
            onClick={() => onChange(tab.id)}
            title={tab.label}
          >
            <span className="tab-btn-icon">{tab.icon}</span>
            <span className="tab-btn-label">{tab.label}</span>
          </button>
        ))}
      </div>
      {activeTab && <p className="tab-hint">{activeTab.hint}</p>}
    </>
  );
}
