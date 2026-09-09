import { FormEvent, useState } from "react";
import { useAppState } from "../context/AppState";
import { CoordinatePicker } from "./CoordinatePicker";

export function DestinationForm({ embedded = false }: { embedded?: boolean } = {}) {
  const { destination, updateDestination } = useAppState();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  const startEditing = () => {
    setName(destination?.name ?? "");
    setLat(destination ? String(destination.lat) : "");
    setLng(destination ? String(destination.lng) : "");
    setEditing(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await updateDestination({ name, lat: Number(lat), lng: Number(lng) });
    setEditing(false);
  };

  return (
    <div className={embedded ? undefined : "section"}>
      <div className={embedded ? "subform-label" : "section-title"}>Destino final (todas as rotas)</div>
      {!editing && (
        <>
          {destination ? (
            <p style={{ fontSize: 13 }}>
              Todas as rotas terminam em <strong>{destination.name}</strong>{" "}
              <span className="list-item-meta">
                ({destination.lat.toFixed(5)}, {destination.lng.toFixed(5)})
              </span>
            </p>
          ) : (
            <p className="section-hint" style={{ marginBottom: 8 }}>
              Nenhum destino compartilhado definido — cada rota usa seu próprio
              comportamento de retorno ao depósito.
            </p>
          )}
          <button type="button" className="btn btn-secondary btn-sm" onClick={startEditing}>
            {destination ? "Editar destino" : "Definir destino"}
          </button>
        </>
      )}

      {editing && (
        <form onSubmit={handleSubmit}>
          <div className="field">
            <input
              className="input"
              placeholder="Nome (ex: ITAM)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <CoordinatePicker
            target="destination"
            lat={lat}
            lng={lng}
            onChange={(newLat, newLng) => {
              setLat(newLat);
              setLng(newLng);
            }}
          />
          <div className="btn-group" style={{ marginTop: 10 }}>
            <button type="submit" className="btn btn-primary btn-sm">
              Salvar destino
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
