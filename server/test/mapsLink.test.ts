import { describe, expect, it } from "vitest";
import { buildGoogleMapsLink } from "../src/services/mapsLink";

const origin = { lat: -3.13, lng: -60.02 };
const stop1 = { lat: -3.128, lng: -60.021 };
const stop2 = { lat: -3.132, lng: -60.026 };
const destination = { lat: -3.07, lng: -59.91 };

describe("buildGoogleMapsLink", () => {
  it("retorna ao deposito: origem e destino sao o mesmo ponto, todas as paradas como waypoints", () => {
    const url = buildGoogleMapsLink(origin, [stop1, stop2], origin);
    expect(url).toContain("origin=-3.13%2C-60.02");
    expect(url).toContain("destination=-3.13%2C-60.02");
    expect(url).toContain(`waypoints=${encodeURIComponent(`${stop1.lat},${stop1.lng}|${stop2.lat},${stop2.lng}`)}`);
    expect(url).toContain("travelmode=driving");
  });

  it("com destino global: todas as paradas como waypoints, destino e o ponto compartilhado", () => {
    const url = buildGoogleMapsLink(origin, [stop1, stop2], destination);
    expect(url).toContain(`destination=${encodeURIComponent(`${destination.lat},${destination.lng}`)}`);
    expect(url).toContain(`waypoints=${encodeURIComponent(`${stop1.lat},${stop1.lng}|${stop2.lat},${stop2.lng}`)}`);
  });

  it("trajeto aberto (sem endpoint): destino e a ultima parada, resto vira waypoint", () => {
    const url = buildGoogleMapsLink(origin, [stop1, stop2], null);
    expect(url).toContain(`destination=${encodeURIComponent(`${stop2.lat},${stop2.lng}`)}`);
    expect(url).toContain(`waypoints=${encodeURIComponent(`${stop1.lat},${stop1.lng}`)}`);
  });

  it("sem paradas e sem destino real: nao ha trajeto, retorna null", () => {
    expect(buildGoogleMapsLink(origin, [], null)).toBeNull();
    expect(buildGoogleMapsLink(origin, [], origin)).toBeNull();
  });

  it("sem paradas mas com destino real (rota exclusiva direto pro destino): sem waypoints", () => {
    const url = buildGoogleMapsLink(origin, [], destination);
    expect(url).not.toBeNull();
    expect(url).toContain(`destination=${encodeURIComponent(`${destination.lat},${destination.lng}`)}`);
    expect(url).not.toContain("waypoints=");
  });
});
