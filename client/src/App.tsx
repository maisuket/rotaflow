import { useState } from "react";
import { AppStateProvider } from "./context/AppState";
import { LocationForm } from "./components/LocationForm";
import { LocationImportForm } from "./components/LocationImportForm";
import { LocationList } from "./components/LocationList";
import { RouteForm } from "./components/RouteForm";
import { RouteList } from "./components/RouteList";
import { OptimizeButton } from "./components/OptimizeButton";
import { ResultsPanel } from "./components/ResultsPanel";
import { DestinationForm } from "./components/DestinationForm";
import { DepartureTimeForm } from "./components/DepartureTimeForm";
import { MapView } from "./components/MapView";
import { AutoOptimizePanel } from "./components/AutoOptimizePanel";
import { SettingsPopover } from "./components/SettingsPopover";
import { TripBoardingPanel } from "./components/TripBoardingPanel";
import { ReportsPanel } from "./components/ReportsPanel";
import { StatsStrip } from "./components/StatsStrip";
import { IconRail, TABS, TabId } from "./components/IconRail";
import { getAuthToken, setAuthToken } from "./api/authToken";

export default function App() {
  const handleLogout = () => {
    setAuthToken(null);
    window.location.reload();
  };

  // So tem efeito em telas de celular (ver media query em styles.css) — em
  // telas largas, rail + painel + mapa ficam lado a lado sempre.
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [activeTab, setActiveTab] = useState<TabId>("rotas");
  const activeTabDef = TABS.find((t) => t.id === activeTab)!;

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

        <IconRail
          active={activeTab}
          onChange={setActiveTab}
          trailing={
            <>
              <SettingsPopover />
              {getAuthToken() && (
                <button className="btn-icon" title="Sair" onClick={handleLogout}>
                  🚪
                </button>
              )}
            </>
          }
        />

        <aside className="content-panel">
          <div className="content-panel-header">
            <h1 className="content-panel-title">
              <span aria-hidden="true">{activeTabDef.icon}</span> {activeTabDef.label}
            </h1>
            <p className="content-panel-hint">{activeTabDef.hint}</p>
          </div>

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
                <div className="section-title">Opções da otimização</div>
                <DestinationForm embedded />
                <hr className="divider" style={{ margin: "12px 0" }} />
                <DepartureTimeForm embedded />
              </div>
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
          <StatsStrip />
          <div className="map-area">
            <MapView />
          </div>
        </main>
      </div>
    </AppStateProvider>
  );
}
