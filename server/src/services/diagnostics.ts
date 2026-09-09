import { GoogleMapsClient } from "../types";

export interface GoogleDiagnostics {
  serverKeyConfigured: boolean;
  distanceMatrix: { checked: boolean; ok: boolean; error: string | null };
}

export async function checkGoogleDiagnostics(
  apiKey: string,
  createClient: (key: string) => GoogleMapsClient
): Promise<GoogleDiagnostics> {
  if (!apiKey) {
    return {
      serverKeyConfigured: false,
      distanceMatrix: { checked: false, ok: false, error: null },
    };
  }

  const client = createClient(apiKey);
  try {
    await client.getDistanceMatrix({
      origins: [{ lat: 0, lng: 0 }],
      destinations: [{ lat: 0, lng: 0 }],
    });
    return {
      serverKeyConfigured: true,
      distanceMatrix: { checked: true, ok: true, error: null },
    };
  } catch (err) {
    return {
      serverKeyConfigured: true,
      distanceMatrix: {
        checked: true,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
    };
  }
}
