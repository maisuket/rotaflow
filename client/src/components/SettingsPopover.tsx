import { useEffect, useRef, useState } from "react";
import { GoogleDiagnosticsPanel } from "./GoogleDiagnosticsPanel";
import { DestinationForm } from "./DestinationForm";
import { DepartureTimeForm } from "./DepartureTimeForm";

/**
 * Icone de engrenagem no cabecalho — abre um popover com as configuracoes
 * globais que se aplicam a toda otimizacao (destino compartilhado, horario
 * de partida) e o diagnostico do Google Maps. Coisas que se configura uma
 * vez e raramente revisita, por isso ficam fora das abas principais.
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
          <div className="section-title" style={{ marginBottom: 10 }}>Configurações</div>

          <DestinationForm embedded />
          <hr className="divider" style={{ margin: "12px 0" }} />
          <DepartureTimeForm embedded />
          <hr className="divider" style={{ margin: "12px 0" }} />
          <div className="subform-label">Diagnóstico do Google Maps</div>
          <GoogleDiagnosticsPanel embedded />
        </div>
      )}
    </div>
  );
}
