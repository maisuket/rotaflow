import { useEffect, useRef, useState } from "react";
import { GoogleDiagnosticsPanel } from "./GoogleDiagnosticsPanel";

/**
 * Icone de engrenagem no cabecalho — abre o diagnostico do Google Maps, uma
 * checagem tecnica que se olha raramente (nao um fluxo do dia a dia). Destino
 * compartilhado e horario de partida moraram aqui antes, mas afetam
 * diretamente o resultado da proxima otimizacao — foram pra dentro da aba
 * Otimizar, perto do botao que eles influenciam, em vez de escondidos atras
 * da engrenagem.
 */
export function SettingsPopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        className="btn-icon"
        title="Configurações"
        onClick={() => setOpen((v) => !v)}
      >
        ⚙️
      </button>
      {open && (
        <div className="settings-popover">
          <div className="section-title" style={{ marginBottom: 10 }}>Diagnóstico do Google Maps</div>
          <GoogleDiagnosticsPanel embedded />
        </div>
      )}
    </div>
  );
}
