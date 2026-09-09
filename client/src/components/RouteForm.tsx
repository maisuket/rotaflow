import { FormEvent, useState } from "react";
import { useAppState } from "../context/AppState";
import { RouteOriginMode } from "../types";
import { CoordinatePicker } from "./CoordinatePicker";
import { VehicleDetailsFields, VehicleDetailsValue } from "./VehicleDetailsFields";

const EMPTY_VEHICLE_DETAILS: VehicleDetailsValue = {
  driverName: "",
  driverPhone: "",
  vehiclePlate: "",
  vehicleTypeLabel: "",
  speedFactor: "1",
  costPerKm: "0",
  activeWeekdays: [],
};

export function RouteForm() {
  const { addRoute, destination, routes } = useAppState();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [depotLat, setDepotLat] = useState("");
  const [depotLng, setDepotLng] = useState("");
  const [capacity, setCapacity] = useState("4");
  const [returnToDepot, setReturnToDepot] = useState(true);
  const [originMode, setOriginMode] = useState<RouteOriginMode>("depot");
  const [vehicleDetails, setVehicleDetails] = useState<VehicleDetailsValue>(EMPTY_VEHICLE_DETAILS);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await addRoute({
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
    setName("");
    setDepotLat("");
    setDepotLng("");
    setCapacity("4");
    setReturnToDepot(true);
    setOriginMode("depot");
    setVehicleDetails(EMPTY_VEHICLE_DETAILS);
  };

  const isFirstPassenger = originMode === "firstPassenger";

  return (
    <>
      <div
        className="section-title"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <span>
          Rotas <span className="badge badge-muted" style={{ marginLeft: 4 }}>{routes.length}</span>
        </span>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen((v) => !v)}>
          {open ? "Cancelar" : "+ Nova rota"}
        </button>
      </div>

      {open && (
        <form onSubmit={handleSubmit} style={{ marginBottom: 10 }}>
          <div className="field">
            <input
              className="input"
              placeholder="Nome da rota"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <label className="field-label">
            {isFirstPassenger ? "Área de referência (para alocação)" : "Origem (depósito)"}
          </label>
          <CoordinatePicker
            target="routeOrigin"
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
              name="originMode"
              checked={!isFirstPassenger}
              onChange={() => setOriginMode("depot")}
            />
            Depósito cadastrado acima
          </label>
          <label className="checkbox-field" style={{ marginTop: 0 }}>
            <input
              type="radio"
              name="originMode"
              checked={isFirstPassenger}
              onChange={() => setOriginMode("firstPassenger")}
            />
            Melhor passageiro (calculado ao otimizar)
          </label>
          {isFirstPassenger && (
            <p className="section-hint" style={{ marginTop: 2 }}>
              O trajeto vai começar em um dos passageiros atribuídos a esta rota — a
              otimização escolhe qual é o melhor ponto de partida.
            </p>
          )}

          <div className="field" style={{ marginTop: 10 }}>
            <label className="field-label">Capacidade</label>
            <input
              className="input"
              placeholder="Capacidade"
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
              disabled={Boolean(destination) || isFirstPassenger}
            />
            Retornar ao depósito
          </label>
          {destination && (
            <div className="alert alert-warning">
              Ignorado: todas as rotas estão terminando em "{destination.name}" (destino
              compartilhado).
            </div>
          )}
          {!destination && isFirstPassenger && (
            <div className="alert alert-warning">
              Ignorado: sem depósito fixo, não há como "retornar" a ele.
            </div>
          )}

          <VehicleDetailsFields value={vehicleDetails} onChange={setVehicleDetails} />

          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 10 }}>
            Adicionar rota
          </button>
        </form>
      )}
    </>
  );
}
