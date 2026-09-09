import { FormEvent, useState } from "react";
import { RouteOriginMode, RouteVehicle } from "../types";
import { useAppState } from "../context/AppState";
import { colorForRouteIndex } from "../utils/colors";
import { CoordinatePicker } from "./CoordinatePicker";
import { ConfirmButton } from "./ConfirmButton";
import { RouteShapeIcon } from "./RouteShapeIcon";
import { shapeForRouteIndex } from "../utils/shapes";
import { VehicleDetailsFields, VehicleDetailsValue } from "./VehicleDetailsFields";
import { timestampTitle } from "../utils/format";

function EditRouteForm({ route, onDone }: { route: RouteVehicle; onDone: () => void }) {
  const { updateRoute } = useAppState();
  const [name, setName] = useState(route.name);
  const [depotLat, setDepotLat] = useState(String(route.depotLat));
  const [depotLng, setDepotLng] = useState(String(route.depotLng));
  const [capacity, setCapacity] = useState(String(route.capacity));
  const [returnToDepot, setReturnToDepot] = useState(route.returnToDepot);
  const [originMode, setOriginMode] = useState<RouteOriginMode>(route.originMode);
  const [vehicleDetails, setVehicleDetails] = useState<VehicleDetailsValue>({
    driverName: route.driverName ?? "",
    driverPhone: route.driverPhone ?? "",
    vehiclePlate: route.vehiclePlate ?? "",
    vehicleTypeLabel: route.vehicleTypeLabel ?? "",
    speedFactor: String(route.speedFactor),
    costPerKm: String(route.costPerKm),
    activeWeekdays: route.activeWeekdays ?? [],
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await updateRoute(route.id, {
      name,
      depotLat: Number(depotLat),
      depotLng: Number(depotLng),
      capacity: Number(capacity) || 1,
      returnToDepot,
      originMode,
      driverName: vehicleDetails.driverName || null,
      driverPhone: vehicleDetails.driverPhone || null,
      vehiclePlate: vehicleDetails.vehiclePlate || null,
      vehicleTypeLabel: vehicleDetails.vehicleTypeLabel || null,
      speedFactor: Number(vehicleDetails.speedFactor) || 1,
      costPerKm: Number(vehicleDetails.costPerKm) || 0,
      activeWeekdays: vehicleDetails.activeWeekdays.length > 0 ? vehicleDetails.activeWeekdays : null,
    });
    onDone();
  };

  const isFirstPassenger = originMode === "firstPassenger";

  return (
    <form onSubmit={handleSubmit} className="subform-box" style={{ margin: 0 }}>
      <div className="field">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <label className="field-label">
        {isFirstPassenger ? "Área de referência (para alocação)" : "Origem (depósito)"}
      </label>
      <CoordinatePicker
        target={`routeOriginEdit:${route.id}`}
        lat={depotLat}
        lng={depotLng}
        onChange={(newLat, newLng) => {
          setDepotLat(newLat);
          setDepotLng(newLng);
        }}
      />

      <label className="field-label" style={{ marginTop: 6 }}>
        Ponto de partida do trajeto
      </label>
      <label className="checkbox-field">
        <input
          type="radio"
          name={`originMode-${route.id}`}
          checked={!isFirstPassenger}
          onChange={() => setOriginMode("depot")}
        />
        Depósito cadastrado acima
      </label>
      <label className="checkbox-field" style={{ marginTop: 0 }}>
        <input
          type="radio"
          name={`originMode-${route.id}`}
          checked={isFirstPassenger}
          onChange={() => setOriginMode("firstPassenger")}
        />
        Melhor passageiro (calculado ao otimizar)
      </label>

      <div className="field" style={{ marginTop: 10 }}>
        <label className="field-label">Capacidade</label>
        <input
          className="input"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          type="number"
          min={1}
          style={{ maxWidth: 100 }}
        />
      </div>
      <label className="checkbox-field">
        <input
          type="checkbox"
          checked={returnToDepot}
          onChange={(e) => setReturnToDepot(e.target.checked)}
          disabled={isFirstPassenger}
        />
        Retornar ao depósito
      </label>

      <VehicleDetailsFields value={vehicleDetails} onChange={setVehicleDetails} />

      <div className="btn-group" style={{ marginTop: 8 }}>
        <button type="submit" className="btn btn-primary btn-sm">
          Salvar
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onDone}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

export function RouteList() {
  const { routes, removeRoute } = useAppState();
  const [editingId, setEditingId] = useState<string | null>(null);

  if (routes.length === 0) {
    return <p className="empty-hint">Nenhuma rota cadastrada.</p>;
  }

  return (
    <ul className="list" style={{ marginTop: 10 }}>
      {routes.map((route, index) =>
        editingId === route.id ? (
          <li key={route.id}>
            <EditRouteForm route={route} onDone={() => setEditingId(null)} />
          </li>
        ) : (
          <li className="list-item list-item-stack" key={route.id} title={timestampTitle(route)}>
            <div className="list-item-row">
              <RouteShapeIcon shape={shapeForRouteIndex(index)} color={colorForRouteIndex(index)} />
              <span className="list-item-main">
                {route.name}{" "}
                <span className="list-item-meta">
                  ({route.depotLat.toFixed(4)}, {route.depotLng.toFixed(4)})
                </span>
              </span>
            </div>
            <div className="list-item-footer">
              {route.originMode === "firstPassenger" && (
                <span className="badge badge-primary">origem: passageiro</span>
              )}
              <span className="badge badge-muted">cap. {route.capacity}</span>
              {route.driverName && <span className="badge badge-muted">🧑‍✈️ {route.driverName}</span>}
              {route.vehicleTypeLabel && <span className="badge badge-muted">{route.vehicleTypeLabel}</span>}
              {route.activeWeekdays && route.activeWeekdays.length > 0 && (
                <span className="badge badge-muted">
                  {route.activeWeekdays.map((d) => ["D", "S", "T", "Q", "Q", "S", "S"][d]).join("")}
                </span>
              )}
              <div className="list-item-actions">
                <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(route.id)}>
                  Editar
                </button>
                <ConfirmButton
                  onConfirm={() => removeRoute(route.id)}
                  confirmText={`Excluir "${route.name}"?`}
                />
              </div>
            </div>
          </li>
        )
      )}
    </ul>
  );
}
