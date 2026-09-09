import { useEffect, useState } from "react";
import { useAppState } from "../context/AppState";

export function DepartureTimeForm({ embedded = false }: { embedded?: boolean } = {}) {
  const { settings, updateDepartureTime } = useAppState();
  const [value, setValue] = useState(settings.departureTime ?? "");

  // `settings` chega assincronamente do backend depois do primeiro render —
  // sincroniza o campo local quando o valor carregado (ou mudar por outro motivo).
  useEffect(() => {
    setValue(settings.departureTime ?? "");
  }, [settings.departureTime]);

  const handleSave = async () => {
    await updateDepartureTime(value || null);
  };

  const handleClear = async () => {
    setValue("");
    await updateDepartureTime(null);
  };

  return (
    <div className={embedded ? undefined : "section"}>
      <div className={embedded ? "subform-label" : "section-title"}>Horário de partida</div>
      {!embedded && (
        <p className="section-hint">
          Opcional — quando definido, cada parada mostra o horário estimado de chegada.
        </p>
      )}
      <div className="input-row">
        <input
          className="input"
          type="time"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          style={{ maxWidth: 140 }}
        />
        <button className="btn btn-secondary btn-sm" onClick={handleSave}>
          Salvar
        </button>
        {settings.departureTime && (
          <button className="btn btn-ghost btn-sm" onClick={handleClear}>
            Limpar
          </button>
        )}
      </div>
    </div>
  );
}
