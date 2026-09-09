const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const VEHICLE_PRESETS: Record<string, { speedFactor: string; costPerKm: string }> = {
  Carro: { speedFactor: "1", costPerKm: "1.5" },
  Van: { speedFactor: "1.1", costPerKm: "2.5" },
  Ônibus: { speedFactor: "1.25", costPerKm: "4" },
};

export interface VehicleDetailsValue {
  driverName: string;
  driverPhone: string;
  vehiclePlate: string;
  vehicleTypeLabel: string;
  speedFactor: string;
  costPerKm: string;
  /** Vazio = roda todo dia. */
  activeWeekdays: number[];
}

interface VehicleDetailsFieldsProps {
  value: VehicleDetailsValue;
  onChange: (value: VehicleDetailsValue) => void;
}

/**
 * Bloco reutilizavel de motorista/veiculo/tipo/recorrencia semanal, usado
 * tanto no formulario de nova rota quanto na edicao inline de uma existente.
 */
export function VehicleDetailsFields({ value, onChange }: VehicleDetailsFieldsProps) {
  const set = (patch: Partial<VehicleDetailsValue>) => onChange({ ...value, ...patch });

  const applyPreset = (label: string) => {
    const preset = VEHICLE_PRESETS[label];
    if (preset) {
      set({ vehicleTypeLabel: label, speedFactor: preset.speedFactor, costPerKm: preset.costPerKm });
    } else {
      set({ vehicleTypeLabel: label });
    }
  };

  const toggleWeekday = (day: number) => {
    const has = value.activeWeekdays.includes(day);
    set({
      activeWeekdays: has
        ? value.activeWeekdays.filter((d) => d !== day)
        : [...value.activeWeekdays, day].sort(),
    });
  };

  return (
    <div className="subform-box">
      <div className="subform-label">Motorista e veículo (opcional)</div>

      <div className="input-row" style={{ marginBottom: 6 }}>
        <input
          className="input"
          placeholder="Nome do motorista"
          value={value.driverName}
          onChange={(e) => set({ driverName: e.target.value })}
        />
        <input
          className="input"
          placeholder="Telefone"
          value={value.driverPhone}
          onChange={(e) => set({ driverPhone: e.target.value })}
        />
      </div>

      <div className="input-row" style={{ marginBottom: 6 }}>
        <input
          className="input"
          placeholder="Placa do veículo"
          value={value.vehiclePlate}
          onChange={(e) => set({ vehiclePlate: e.target.value })}
        />
        <select
          className="input"
          value={Object.keys(VEHICLE_PRESETS).includes(value.vehicleTypeLabel) ? value.vehicleTypeLabel : ""}
          onChange={(e) => applyPreset(e.target.value)}
        >
          <option value="">Tipo de veículo…</option>
          {Object.keys(VEHICLE_PRESETS).map((label) => (
            <option key={label} value={label}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="input-row" style={{ marginBottom: 6 }}>
        <input
          className="input"
          placeholder="Rótulo do tipo (ex: Van)"
          value={value.vehicleTypeLabel}
          onChange={(e) => set({ vehicleTypeLabel: e.target.value })}
        />
      </div>

      <div className="input-row" style={{ marginBottom: 6 }}>
        <div className="field" style={{ flex: 1 }}>
          <label className="field-label" style={{ marginBottom: 2 }}>
            Fator de velocidade
          </label>
          <input
            className="input"
            type="number"
            step="0.05"
            min={0.1}
            value={value.speedFactor}
            onChange={(e) => set({ speedFactor: e.target.value })}
          />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label className="field-label" style={{ marginBottom: 2 }}>
            Custo por km (R$)
          </label>
          <input
            className="input"
            type="number"
            step="0.1"
            min={0}
            value={value.costPerKm}
            onChange={(e) => set({ costPerKm: e.target.value })}
          />
        </div>
      </div>
      <p className="section-hint" style={{ marginTop: 0, marginBottom: 8 }}>
        Fator de velocidade &gt; 1 deixa a rota mais lenta que o carro de referência do Google
        (ex: 1.2 = 20% mais devagar). Custo por km é só pra relatório, não afeta a otimização.
      </p>

      <div className="subform-label">Dias da semana em que a rota roda</div>
      <div className="btn-group" style={{ marginBottom: 4 }}>
        {WEEKDAY_LABELS.map((label, day) => (
          <button
            key={day}
            type="button"
            className={value.activeWeekdays.includes(day) ? "btn btn-primary btn-sm" : "btn btn-secondary btn-sm"}
            onClick={() => toggleWeekday(day)}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="section-hint" style={{ marginTop: 0 }}>
        {value.activeWeekdays.length === 0
          ? "Nenhum dia marcado = roda todo dia."
          : "Ao otimizar, essa rota só entra nos dias marcados."}
      </p>
    </div>
  );
}
