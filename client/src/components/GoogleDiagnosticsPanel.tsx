import { useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import { useAppState } from "../context/AppState";

type CheckState = "idle" | "loading" | "ok" | "error" | "skipped";

function StatusBadge({ state, okLabel, errorLabel, skippedLabel }: {
  state: CheckState;
  okLabel: string;
  errorLabel: string;
  skippedLabel?: string;
}) {
  if (state === "idle") return <span className="badge badge-muted">não verificado</span>;
  if (state === "loading") return <span className="badge badge-muted">verificando…</span>;
  if (state === "ok") return <span className="badge badge-success">✓ {okLabel}</span>;
  if (state === "skipped") return <span className="badge badge-muted">— {skippedLabel}</span>;
  return <span className="badge badge-danger">✗ {errorLabel}</span>;
}

/**
 * `embedded`: usado dentro do popover de configurações (o abrir/fechar do
 * proprio popover ja e o gesto de "quero ver isso" — roda o teste ao montar,
 * em vez de exigir um segundo clique num botao "Detalhes" interno.
 */
export function GoogleDiagnosticsPanel({ embedded = false }: { embedded?: boolean } = {}) {
  const { googleMapsClientStatus } = useAppState();
  const [serverCheck, setServerCheck] = useState<CheckState>("idle");
  const [distanceMatrixCheck, setDistanceMatrixCheck] = useState<CheckState>("idle");
  const [distanceMatrixError, setDistanceMatrixError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(embedded);
  const [hasChecked, setHasChecked] = useState(false);

  const runCheck = async () => {
    setServerCheck("loading");
    setDistanceMatrixCheck("loading");
    setFetchError(null);
    try {
      const result = await api.getGoogleDiagnostics();
      setServerCheck(result.serverKeyConfigured ? "ok" : "error");
      if (!result.distanceMatrix.checked) {
        setDistanceMatrixCheck("skipped");
      } else {
        setDistanceMatrixCheck(result.distanceMatrix.ok ? "ok" : "error");
      }
      setDistanceMatrixError(result.distanceMatrix.error);
    } catch (err) {
      setServerCheck("error");
      setDistanceMatrixCheck("skipped");
      setFetchError(err instanceof ApiError ? err.message : String(err));
    }
  };

  useEffect(() => {
    if (embedded) {
      setHasChecked(true);
      runCheck();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleExpanded = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !hasChecked) {
      setHasChecked(true);
      runCheck();
    }
  };

  const clientCheckState: CheckState =
    googleMapsClientStatus === "ok"
      ? "ok"
      : googleMapsClientStatus === "unconfigured"
        ? "skipped"
        : googleMapsClientStatus === "error"
          ? "error"
          : hasChecked
            ? "loading"
            : "idle";

  const allOk = serverCheck === "ok" && clientCheckState === "ok" && distanceMatrixCheck === "ok";
  const stillLoading =
    serverCheck === "loading" || clientCheckState === "loading" || distanceMatrixCheck === "loading";

  const checksList = (
    <>
      <ul className="list" style={{ marginTop: embedded ? 0 : 8 }}>
        <li className="list-item">
          <span className="list-item-main">Chave do servidor (Distance Matrix / Directions)</span>
          <StatusBadge state={serverCheck} okLabel="configurada" errorLabel="não configurada" />
        </li>
        <li className="list-item">
          <span className="list-item-main">Chave do cliente (Maps JavaScript API)</span>
          <StatusBadge
            state={clientCheckState}
            okLabel="carregada"
            errorLabel="falhou ao carregar"
            skippedLabel="não configurada"
          />
        </li>
        <li className="list-item">
          <span className="list-item-main">Distance Matrix API habilitada</span>
          <StatusBadge
            state={distanceMatrixCheck}
            okLabel="habilitada"
            errorLabel="erro"
            skippedLabel="chave do servidor ausente"
          />
        </li>
      </ul>

      {distanceMatrixError && (
        <div className="alert alert-error" style={{ marginTop: 8 }}>
          {distanceMatrixError}
        </div>
      )}
      {fetchError && (
        <div className="alert alert-error" style={{ marginTop: 8 }}>
          Não foi possível consultar o diagnóstico: {fetchError}
        </div>
      )}

      <button className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={runCheck}>
        Testar novamente
      </button>
    </>
  );

  if (embedded) {
    return (
      <div>
        {stillLoading && <p className="section-hint" style={{ marginTop: 0 }}>Verificando configuração…</p>}
        {checksList}
      </div>
    );
  }

  return (
    <div className="section">
      <div
        className="section-title"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <span>Diagnóstico do Google Maps</span>
        <button className="btn btn-ghost btn-sm" onClick={toggleExpanded}>
          {expanded ? "Ocultar" : "Detalhes"}
        </button>
      </div>

      {!expanded && (
        <p className="section-hint" style={{ margin: 0 }}>
          {!hasChecked
            ? 'Clique em "Detalhes" para verificar a configuração.'
            : stillLoading
              ? "Verificando configuração…"
              : allOk
                ? "✓ Tudo configurado corretamente."
                : "⚠ Há pendências na configuração — clique em \"Detalhes\"."}
        </p>
      )}

      {expanded && checksList}
    </div>
  );
}
