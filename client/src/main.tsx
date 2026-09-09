import { createRoot } from "react-dom/client";
import App from "./App";
import { AuthGate } from "./components/AuthGate";
import "./styles.css";

// Sem <StrictMode>: o double-render/double-effect de dev do StrictMode faz o
// @react-google-maps/api criar 2 overlays (Marker/Polyline) por montagem, e o
// PRIMEIRO nunca recebe o cleanup (setMap(null)) — sobra um "fantasma" no
// mapa a cada resultado novo (ex: a linha da rota anterior nao desaparece ao
// trocar entre modo manual e automatico). O app nao usa nenhuma API legada
// que dependa das checagens extras do StrictMode, entao o custo de tira-lo e baixo.
createRoot(document.getElementById("root")!).render(
  <AuthGate>
    <App />
  </AuthGate>
);
