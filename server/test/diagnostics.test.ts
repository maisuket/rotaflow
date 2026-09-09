import { describe, expect, it, vi } from "vitest";
import { checkGoogleDiagnostics } from "../src/services/diagnostics";
import { GoogleMapsClient } from "../src/types";

function stubClient(overrides: Partial<GoogleMapsClient> = {}): GoogleMapsClient {
  return {
    getDistanceMatrix: vi.fn().mockResolvedValue({ distanceMeters: [[0]], durationSeconds: [[0]] }),
    getDirections: vi.fn(),
    geocodeAddress: vi.fn(),
    ...overrides,
  } as GoogleMapsClient;
}

describe("checkGoogleDiagnostics", () => {
  it("reporta chave nao configurada sem tentar nenhuma chamada", async () => {
    const createClient = vi.fn();
    const result = await checkGoogleDiagnostics("", createClient);
    expect(result).toEqual({
      serverKeyConfigured: false,
      distanceMatrix: { checked: false, ok: false, error: null },
    });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("reporta ok quando a chamada de teste ao Distance Matrix funciona", async () => {
    const client = stubClient();
    const createClient = vi.fn().mockReturnValue(client);
    const result = await checkGoogleDiagnostics("chave-valida", createClient);
    expect(result).toEqual({
      serverKeyConfigured: true,
      distanceMatrix: { checked: true, ok: true, error: null },
    });
    expect(createClient).toHaveBeenCalledWith("chave-valida");
  });

  it("reporta erro quando a chamada de teste falha (ex: API nao habilitada)", async () => {
    const client = stubClient({
      getDistanceMatrix: vi.fn().mockRejectedValue(new Error("Distance Matrix API status REQUEST_DENIED")),
    });
    const createClient = vi.fn().mockReturnValue(client);
    const result = await checkGoogleDiagnostics("chave-sem-api-habilitada", createClient);
    expect(result).toEqual({
      serverKeyConfigured: true,
      distanceMatrix: { checked: true, ok: false, error: "Distance Matrix API status REQUEST_DENIED" },
    });
  });
});
