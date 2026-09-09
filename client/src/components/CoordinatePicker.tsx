import { useEffect, useState } from "react";
import { useAppState, PickTarget } from "../context/AppState";
import { api } from "../api/client";

interface CoordinatePickerProps {
  /** Identifica este picker perante o AppState — cada formulario usa um alvo diferente. */
  target: PickTarget;
  lat: string;
  lng: string;
  onChange: (lat: string, lng: string) => void;
}

/**
 * Bloco reutilizavel de escolha de coordenadas: botao "Selecionar no mapa"
 * (delega ao MapView via pickMode/pickedResult do AppState), busca por
 * CEP/Rua/Bairro (geocodificacao no backend), e os proprios campos lat/lng.
 * Usado em LocationForm, RouteForm (origem) e DestinationForm (destino global).
 */
export function CoordinatePicker({ target, lat, lng, onChange }: CoordinatePickerProps) {
  const { pickMode, setPickMode, pickedResult, setPickedResult } = useAppState();
  const [cep, setCep] = useState("");
  const [rua, setRua] = useState("");
  const [bairro, setBairro] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);

  useEffect(() => {
    if (pickedResult && pickedResult.target === target) {
      onChange(String(pickedResult.lat), String(pickedResult.lng));
      setResolvedAddress(null);
      setPickedResult(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickedResult]);

  const handleBuscarEndereco = async () => {
    const partes = [rua, bairro, cep].map((p) => p.trim()).filter(Boolean);
    if (partes.length === 0) {
      setGeocodeError("Preencha ao menos CEP ou Rua/Bairro");
      return;
    }
    setGeocoding(true);
    setGeocodeError(null);
    setResolvedAddress(null);
    try {
      const result = await api.geocode(partes.join(", ") + ", Brasil");
      onChange(String(result.lat), String(result.lng));
      setResolvedAddress(result.formattedAddress);
    } catch (err: any) {
      setGeocodeError(err.message ?? String(err));
    } finally {
      setGeocoding(false);
    }
  };

  const isPicking = pickMode === target;

  return (
    <div>
      <button
        type="button"
        className={`btn btn-sm ${isPicking ? "btn-active" : "btn-secondary"}`}
        onClick={() => setPickMode(isPicking ? null : target)}
      >
        {isPicking ? "Clique no mapa…" : "📍 Selecionar no mapa"}
      </button>

      <div className="subform-box">
        <div className="subform-label">Ou busque por endereço</div>
        <div className="input-row" style={{ marginBottom: 6 }}>
          <input
            className="input"
            placeholder="CEP"
            value={cep}
            onChange={(e) => setCep(e.target.value)}
          />
        </div>
        <div className="input-row" style={{ marginBottom: 6 }}>
          <input
            className="input"
            placeholder="Rua"
            value={rua}
            onChange={(e) => setRua(e.target.value)}
          />
          <input
            className="input"
            placeholder="Bairro"
            value={bairro}
            onChange={(e) => setBairro(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm btn-block"
          onClick={handleBuscarEndereco}
          disabled={geocoding}
        >
          {geocoding ? "Buscando…" : "Buscar endereço"}
        </button>
        {resolvedAddress && <div className="alert alert-success">Encontrado: {resolvedAddress}</div>}
        {geocodeError && <div className="alert alert-error">{geocodeError}</div>}
      </div>

      <div className="input-row">
        <input
          className="input"
          placeholder="Latitude"
          value={lat}
          onChange={(e) => onChange(e.target.value, lng)}
          type="number"
          step="any"
          required
        />
        <input
          className="input"
          placeholder="Longitude"
          value={lng}
          onChange={(e) => onChange(lat, e.target.value)}
          type="number"
          step="any"
          required
        />
      </div>
    </div>
  );
}
