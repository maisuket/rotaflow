import { DirectionsLeg, GoogleMapsClient } from "../types";

export class GoogleApiError extends Error {
  constructor(
    message: string,
    public readonly googleStatus?: string
  ) {
    super(message);
    this.name = "GoogleApiError";
  }
}

type LatLng = { lat: number; lng: number };

function latLngParam(points: LatLng[]): string {
  return points.map((p) => `${p.lat},${p.lng}`).join("|");
}

/** Cliente real, falando HTTP com as APIs do Google. Injetado nos servicos como GoogleMapsClient. */
export function createGoogleMapsClient(apiKey: string): GoogleMapsClient {
  return {
    async getDistanceMatrix({ origins, destinations }) {
      const url = new URL(
        "https://maps.googleapis.com/maps/api/distancematrix/json"
      );
      url.searchParams.set("origins", latLngParam(origins));
      url.searchParams.set("destinations", latLngParam(destinations));
      url.searchParams.set("key", apiKey);

      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new GoogleApiError(
          `Distance Matrix API HTTP ${res.status}`
        );
      }
      const data: any = await res.json();
      if (data.status !== "OK") {
        throw new GoogleApiError(
          `Distance Matrix API status ${data.status}: ${data.error_message ?? ""}`,
          data.status
        );
      }

      const distanceMeters: (number | null)[][] = [];
      const durationSeconds: (number | null)[][] = [];
      for (const row of data.rows) {
        const distRow: (number | null)[] = [];
        const durRow: (number | null)[] = [];
        for (const element of row.elements) {
          if (element.status === "OK") {
            distRow.push(element.distance.value);
            durRow.push(element.duration.value);
          } else {
            distRow.push(null);
            durRow.push(null);
          }
        }
        distanceMeters.push(distRow);
        durationSeconds.push(durRow);
      }
      return { distanceMeters, durationSeconds };
    },

    async getDirections({ origin, destination, waypoints }) {
      const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
      url.searchParams.set("origin", latLngParam([origin]));
      url.searchParams.set("destination", latLngParam([destination]));
      if (waypoints.length > 0) {
        url.searchParams.set("waypoints", latLngParam(waypoints));
      }
      url.searchParams.set("key", apiKey);

      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new GoogleApiError(`Directions API HTTP ${res.status}`);
      }
      const data: any = await res.json();
      if (data.status !== "OK") {
        throw new GoogleApiError(
          `Directions API status ${data.status}: ${data.error_message ?? ""}`,
          data.status
        );
      }

      const route = data.routes[0];
      const legs: DirectionsLeg[] = route.legs.map((leg: any) => ({
        distanceMeters: leg.distance.value,
        durationSeconds: leg.duration.value,
      }));

      return {
        encodedPolyline: route.overview_polyline.points as string,
        legs,
      };
    },

    async geocodeAddress(query) {
      const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
      url.searchParams.set("address", query);
      url.searchParams.set("region", "br");
      url.searchParams.set("key", apiKey);

      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new GoogleApiError(`Geocoding API HTTP ${res.status}`);
      }
      const data: any = await res.json();
      if (data.status === "ZERO_RESULTS") {
        return null;
      }
      if (data.status !== "OK") {
        throw new GoogleApiError(
          `Geocoding API status ${data.status}: ${data.error_message ?? ""}`,
          data.status
        );
      }

      const result = data.results[0];
      return {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        formattedAddress: result.formatted_address as string,
      };
    },
  };
}
