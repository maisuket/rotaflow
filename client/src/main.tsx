import { createRoot } from "react-dom/client";
import App from "./App";
import { AuthGate } from "./components/AuthGate";
import { DriverBoardingView } from "./components/DriverBoardingView";
import "./styles.css";

// Sem <StrictMode>: o double-render/double-effect de dev do StrictMode faz o
// @react-google-maps/api criar 2 overlays (Marker/Polyline) por montagem, e o
// PRIMEIRO nunca recebe o cleanup (setMap(null)) — sobra um "fantasma" no
// mapa a cada resultado novo (ex: a linha da rota anterior nao desaparece ao
// trocar entre modo manual e automatico). O app nao usa nenhuma API legada
// que dependa das checagens extras do StrictMode, entao o custo de tira-lo e baixo.
const root = createRoot(document.getElementById("root")!);

// Rota publica do motorista (/motorista/:tripRouteId) — roteamento manual por
// pathname em vez de uma lib de rotas, ja que e a unica pagina fora do painel
// admin. Nao passa pelo AuthGate: o motorista nunca digita a senha do painel.
const driverMatch = window.location.pathname.match(/^\/motorista\/([^/]+)\/?$/);

if (driverMatch) {
  root.render(<DriverBoardingView tripRouteId={driverMatch[1]} />);
} else {
  root.render(
    <AuthGate>
      <App />
    </AuthGate>
  );
}
