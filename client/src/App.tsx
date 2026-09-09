import { useState } from "react";
import { AppStateProvider } from "./context/AppState";
import { LocationForm } from "./components/LocationForm";
import { LocationImportForm } from "./components/LocationImportForm";
import { LocationList } from "./components/LocationList";
import { RouteForm } from "./components/RouteForm";
import { RouteList } from "./components/RouteList";
import { OptimizeButton } from "./components/OptimizeButton";
import { ResultsPanel } from "./components/ResultsPanel";
import { MapView } from "./components/MapView";
import { AutoOptimizePanel } from "./components/AutoOptimizePanel";
import { SettingsPopover } from "./components/SettingsPopover";
import { TripBoardingPanel } from "./components/TripBoardingPanel";
import { ReportsPanel } from "./components/ReportsPanel";
import { TabBar, TabId } from "./components/TabBar";
import { getAuthToken, setAuthToken } from "./api/authToken";

export default function App() {
  const handleLogout = () => {
    setAuthToken(null);
    window.location.reload();
  };

  // So tem efeito em telas de celular (ver media query em styles.css) — em
  // telas largas, sidebar e mapa ficam lado a lado sempre, como antes.
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [activeTab, setActiveTab] = useState<TabId>("rotas");

  return (
    <AppStateProvider>
      <div className="app-shell" data-mobile-view={mobileView}>
        <div className="mobile-view-toggle">
          <button
            type="button"
            className={mobileView === "list" ? "btn btn-primary btn-sm" : "btn btn-secondary btn-sm"}
            onClick={() => setMobileView("list")}
          >
            📋 Painel
          </button>
          <button
            type="button"
            className={mobileView === "map" ? "btn btn-primary btn-sm" : "btn btn-secondary btn-sm"}
            onClick={() => setMobileView("map")}
          >
            🗺️ Mapa
          </button>
        </div>
        <aside className="sidebar">
          <div className="sidebar-header">
            <div className="brand-mark">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2C7.6 2 4 5.6 4 10c0 6 8 12 8 12s8-6 8-12c0-4.4-3.6-8-8-8Z"
                  fill="currentColor"
                />
                <circle cx="12" cy="10" r="3" fill="var(--color-primary)" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div className="app-title">BoraBora</div>
              <div className="app-subtitle">Roteirizador de passageiros</div>
            </div>
            <SettingsPopover />
            {getAuthToken() && (
              <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                Sair
              </button>
            )}
          </div>

          <TabBar active={activeTab} onChange={setActiveTab} />

          {activeTab === "rotas" && (
            <div className="section">
              <RouteForm />
              <RouteList />
            </div>
          )}

          {activeTab === "locais" && (
            <>
              <div className="section">
                <LocationForm />
                <LocationList />
              </div>
              <LocationImportForm />
            </>
          )}

          {activeTab === "otimizar" && (
            <>
              <div className="section">
                <OptimizeButton />
                <ResultsPanel />
              </div>
              <AutoOptimizePanel />
            </>
          )}

          {activeTab === "embarque" && <TripBoardingPanel />}

          {activeTab === "relatorios" && <ReportsPanel />}
        </aside>

        <main className="main">
          <MapView />
        </main>
      </div>
    </AppStateProvider>
  );
}
