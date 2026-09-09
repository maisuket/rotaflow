import { FormEvent, useState } from "react";
import { useAppState } from "../context/AppState";
import { CoordinatePicker } from "./CoordinatePicker";

export function LocationForm() {
  const { addLocation, locations } = useAppState();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [demand, setDemand] = useState("1");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await addLocation({
      name,
      lat: Number(lat),
      lng: Number(lng),
      demand: Number(demand) || 1,
    });
    setName("");
    setLat("");
    setLng("");
    setDemand("1");
  };

  return (
    <>
      <div
        className="section-title"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <span>
          Localizações <span className="badge badge-muted" style={{ marginLeft: 4 }}>{locations.length}</span>
        </span>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen((v) => !v)}>
          {open ? "Cancelar" : "+ Nova localização"}
        </button>
      </div>

      {open && (
        <form onSubmit={handleSubmit} style={{ marginBottom: 10 }}>
          <div className="field">
            <input
              className="input"
              placeholder="Nome do passageiro"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <CoordinatePicker
            target="location"
            lat={lat}
            lng={lng}
            onChange={(newLat, newLng) => {
              setLat(newLat);
              setLng(newLng);
            }}
          />

          <div className="field" style={{ marginTop: 10 }}>
            <label className="field-label">Passageiros</label>
            <input
              className="input"
              value={demand}
              onChange={(e) => setDemand(e.target.value)}
              type="number"
              min={1}
              style={{ maxWidth: 100 }}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block">
            Adicionar localização
          </button>
        </form>
      )}
    </>
  );
}
