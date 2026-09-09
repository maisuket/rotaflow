import { Fragment, useEffect, useMemo, useState } from "react";
import { GoogleMap, InfoWindow, Marker, Polyline, useLoadScript } from "@react-google-maps/api";
import { useAppState } from "../context/AppState";
import { colorForRouteIndex } from "../utils/colors";
import { markerIconForShape, shapeForRouteIndex } from "../utils/shapes";
import { decodePolyline } from "../utils/polyline";
import { GlobalDestination, Location, OptimizedRouteResult, RouteVehicle } from "../types";
import { formatClock, formatDistance, formatDuration } from "../utils/format";

const containerStyle = { width: "100%", height: "100%" };
const DEFAULT_CENTER = { lat: -3.119, lng: -60.0217 }; // Manaus-AM, usado so como fallback

// Icone customizado (quadrado) para diferenciar o marcador de DESTINO do de ORIGEM (circulo).
const DESTINATION_SQUARE_PATH = "M -7,-7 7,-7 7,7 -7,7 z";
// Estrela para o destino GLOBAL (compartilhado por todas as rotas).
const STAR_PATH =
  "M 0,-10 L 2.9,-3.1 10,-3.1 4.5,1.2 6.5,8.1 0,4 -6.5,8.1 -4.5,1.2 -10,-3.1 -2.9,-3.1 Z";
// Losango, usado como "halo" atras do passageiro escolhido como origem no modo automatico
// (nao ha deposito separado — a origem E um dos proprios passageiros).
const DIAMOND_PATH = "M 0,-9 L 9,0 L 0,9 L -9,0 Z";

type SelectedMarker =
  | {
      kind: "location";
      position: { lat: number; lng: number };
      location: Location;
      routeName?: string;
      order?: number;
      etaSeconds?: number;
    }
  | { kind: "origin"; position: { lat: number; lng: number }; route: RouteVehicle; optimized?: OptimizedRouteResult }
  | { kind: "destination"; position: { lat: number; lng: number }; route: RouteVehicle; optimized: OptimizedRouteResult }
  | { kind: "globalDestination"; position: { lat: number; lng: number }; destination: GlobalDestination }
  | { kind: "autoOrigin"; position: { lat: number; lng: number }; optimized: OptimizedRouteResult };

export function MapView() {
  const {
    locations,
    routes,
    destination,
    result,
    pickMode,
    setPickMode,
    pickedResult,
    setPickedResult,
    setGoogleMapsClientStatus,
  } = useAppState();
  const hasClientKey = Boolean(import.meta.env.VITE_GOOGLE_MAPS_JS_KEY);
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_JS_KEY ?? "",
  });

  useEffect(() => {
    if (!hasClientKey) setGoogleMapsClientStatus("unconfigured");
    else if (loadError) setGoogleMapsClientStatus("error");
    else if (isLoaded) setGoogleMapsClientStatus("ok");
    else setGoogleMapsClientStatus("loading");
  }, [hasClientKey, loadError, isLoaded, setGoogleMapsClientStatus]);

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (!pickMode || !e.latLng) return;
    setPickedResult({ target: pickMode, lat: e.latLng.lat(), lng: e.latLng.lng() });
    setPickMode(null);
  };

  const [selected, setSelected] = useState<SelectedMarker | null>(null);

  // Cor estavel por rota (chaveada por id, nao por indice) para nao dessincronizar
  // caso a ordem de `routes` mude em relacao a ordem de `result.routes`.
  const colorByRouteId = useMemo(() => {
    const map = new Map<string, string>();
    routes.forEach((r, i) => map.set(r.id, colorForRouteIndex(i)));
    // Rotas do modo automatico nao existem em `routes` (nao sao pre-cadastradas) —
    // continuam a mesma paleta a partir do indice seguinte.
    if (result) {
      let autoIndex = routes.length;
      result.routes.forEach((r) => {
        if (!map.has(r.routeId)) {
          map.set(r.routeId, colorForRouteIndex(autoIndex));
          autoIndex++;
        }
      });
    }
    return map;
  }, [routes, result]);

  // Forma do marcador (circulo/quadrado/triangulo/...) pareada 1-para-1 com a
  // cor acima (mesmo indice) — complementa a cor pra diferenciar rotas sem
  // depender so dela (util pra quem tem daltonismo).
  const shapeByRouteId = useMemo(() => {
    const map = new Map<string, ReturnType<typeof shapeForRouteIndex>>();
    routes.forEach((r, i) => map.set(r.id, shapeForRouteIndex(i)));
    if (result) {
      let autoIndex = routes.length;
      result.routes.forEach((r) => {
        if (!map.has(r.routeId)) {
          map.set(r.routeId, shapeForRouteIndex(autoIndex));
          autoIndex++;
        }
      });
    }
    return map;
  }, [routes, result]);

  const autoOnlyRoutes = useMemo(
    () => (result?.routes ?? []).filter((r) => !routes.some((rt) => rt.id === r.routeId)),
    [result, routes]
  );

  // locationId -> { routeId, routeName, order, etaSeconds } (order = posicao de visita, 1-based)
  const stopMeta = useMemo(() => {
    const map = new Map<
      string,
      { routeId: string; routeName: string; order: number; etaSeconds?: number }
    >();
    if (result) {
      result.routes.forEach((route) => {
        route.stops.forEach((stop, i) =>
          map.set(stop.locationId, {
            routeId: route.routeId,
            routeName: route.routeName,
            order: i + 1,
            etaSeconds: stop.etaSeconds,
          })
        );
      });
    }
    return map;
  }, [result]);

  const center = useMemo(() => {
    if (routes[0]) return { lat: routes[0].depotLat, lng: routes[0].depotLng };
    if (locations[0]) return { lat: locations[0].lat, lng: locations[0].lng };
    return DEFAULT_CENTER;
  }, [routes, locations]);

  if (!hasClientKey) {
    return (
      <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center" }}>
        <p className="section-hint" style={{ maxWidth: 320, textAlign: "center" }}>
          Configure VITE_GOOGLE_MAPS_JS_KEY em client/.env para exibir o mapa.
        </p>
      </div>
    );
  }
  if (loadError)
    return (
      <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center" }}>
        <p className="alert alert-error">Erro ao carregar o Google Maps.</p>
      </div>
    );
  if (!isLoaded)
    return (
      <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center" }}>
        <p className="section-hint">Carregando mapa…</p>
      </div>
    );

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {pickMode && <div className="map-banner">📍 Clique no mapa para escolher o ponto</div>}
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={12}
        onClick={handleMapClick}
        options={{
          draggableCursor: pickMode ? "crosshair" : undefined,
          // Evita que POIs nativos do Google (comercios, bairros) "roubem" cliques
          // dos nossos marcadores quando ficam sobrepostos.
          clickableIcons: false,
        }}
      >
      {pickedResult && (
        <Marker
          position={{ lat: pickedResult.lat, lng: pickedResult.lng }}
          title="Ponto selecionado no mapa"
          icon={{
            path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
            scale: 6,
            rotation: 180,
            fillColor: "#ff9800",
            fillOpacity: 1,
            strokeColor: "#000",
            strokeWeight: 1,
          }}
          zIndex={200}
          options={{ optimized: false }}
        />
      )}

      {destination && (
        <Marker
          position={{ lat: destination.lat, lng: destination.lng }}
          title={`Destino final (todas as rotas): ${destination.name}`}
          icon={{
            path: STAR_PATH,
            scale: 1.4,
            fillColor: "#111",
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 1,
          }}
          zIndex={300}
          options={{ optimized: false }}
          onClick={() =>
            setSelected({
              kind: "globalDestination",
              position: { lat: destination.lat, lng: destination.lng },
              destination,
            })
          }
        />
      )}

      {routes.map((route) => {
        const color = colorByRouteId.get(route.id)!;
        const optimized = result?.routes.find((r) => r.routeId === route.id);
        const lastStop = optimized?.stops[optimized.stops.length - 1];
        const usesFirstPassengerOrigin = route.originMode === "firstPassenger";
        // Sem deposito fixo, ou nao retornando a ele, o "final" so e distinto quando
        // nao ha destino global compartilhado (que ai manda em todo mundo).
        const isOpenEnded = usesFirstPassengerOrigin ? true : !route.returnToDepot;
        const hasDistinctDestination = !destination && isOpenEnded && Boolean(lastStop);

        return (
          <Fragment key={route.id}>
            {usesFirstPassengerOrigin ? (
              // Sem deposito real: so mostra a origem depois de otimizar, no
              // passageiro que a otimizacao escolheu (mesmo estilo do modo automatico).
              optimized && optimized.stops.length > 0 && (
                <Marker
                  position={optimized.depot}
                  title={`Origem escolhida pela otimização: ${route.name}`}
                  icon={{
                    path: DIAMOND_PATH,
                    scale: 1.3,
                    fillColor: color,
                    fillOpacity: 0.5,
                    strokeColor: "#000",
                    strokeWeight: 1.5,
                  }}
                  zIndex={90}
                  options={{ optimized: false }}
                  onClick={() =>
                    setSelected({ kind: "origin", position: optimized.depot, route, optimized })
                  }
                />
              )
            ) : (
              <Marker
                position={{ lat: route.depotLat, lng: route.depotLng }}
                title={
                  destination
                    ? `Origem: ${route.name} (destino: ${destination.name})`
                    : hasDistinctDestination
                      ? `Origem: ${route.name}`
                      : `Origem e destino: ${route.name} (retorna ao deposito)`
                }
                label={{ text: route.name.charAt(0).toUpperCase(), color: "#fff" }}
                icon={{
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 11,
                  fillColor: color,
                  fillOpacity: 1,
                  strokeColor: "#000",
                  strokeWeight: 2,
                }}
                zIndex={100}
                options={{ optimized: false }}
                onClick={() =>
                  setSelected({
                    kind: "origin",
                    position: { lat: route.depotLat, lng: route.depotLng },
                    route,
                    optimized,
                  })
                }
              />
            )}
            {hasDistinctDestination && lastStop && optimized && (
              <Marker
                position={{ lat: lastStop.lat, lng: lastStop.lng }}
                title={`Destino: ${route.name} (ultima parada: ${lastStop.name})`}
                label={{ text: "F", color: "#fff", fontSize: "11px" }}
                icon={{
                  path: DESTINATION_SQUARE_PATH,
                  scale: 1.4,
                  fillColor: color,
                  fillOpacity: 1,
                  strokeColor: "#000",
                  strokeWeight: 2,
                }}
                zIndex={100}
                options={{ optimized: false }}
                onClick={() =>
                  setSelected({
                    kind: "destination",
                    position: { lat: lastStop.lat, lng: lastStop.lng },
                    route,
                    optimized,
                  })
                }
              />
            )}
          </Fragment>
        );
      })}

      {locations.map((loc) => {
        const meta = stopMeta.get(loc.id);
        const color = meta ? colorByRouteId.get(meta.routeId) ?? "#888888" : "#888888";
        const shape = meta ? shapeByRouteId.get(meta.routeId) ?? { kind: "circle" as const } : { kind: "circle" as const };
        const title = meta
          ? `${loc.name} — ${loc.demand} pax (parada ${meta.order} da rota ${meta.routeName})` +
            (meta.etaSeconds !== undefined ? ` — chegada ${formatClock(meta.etaSeconds)}` : "")
          : `${loc.name} — ${loc.demand} pax (ainda nao alocado)`;
        return (
          <Marker
            key={loc.id}
            position={{ lat: loc.lat, lng: loc.lng }}
            title={title}
            label={
              meta
                ? { text: String(meta.order), color: "#fff", fontSize: "10px" }
                : undefined
            }
            icon={markerIconForShape(shape, color)}
            zIndex={150}
            options={{ optimized: false }}
            onClick={() =>
              setSelected({
                kind: "location",
                position: { lat: loc.lat, lng: loc.lng },
                location: loc,
                routeName: meta?.routeName,
                order: meta?.order,
                etaSeconds: meta?.etaSeconds,
              })
            }
          />
        );
      })}

      {autoOnlyRoutes.map((route) => {
        const color = colorByRouteId.get(route.routeId) ?? "#888888";
        return (
          <Marker
            key={`auto-origin-${route.routeId}`}
            position={route.depot}
            title={`Origem escolhida pela otimização: ${route.routeName}`}
            icon={{
              path: DIAMOND_PATH,
              scale: 1.3,
              fillColor: color,
              fillOpacity: 0.5,
              strokeColor: "#000",
              strokeWeight: 1.5,
            }}
            zIndex={90}
            options={{ optimized: false }}
            onClick={() =>
              setSelected({ kind: "autoOrigin", position: route.depot, optimized: route })
            }
          />
        );
      })}

      {selected && (
        <InfoWindow position={selected.position} onCloseClick={() => setSelected(null)}>
          <div className="info-window">
            {selected.kind === "location" && (
              <>
                <strong>{selected.location.name}</strong>
                <div>{selected.location.demand} passageiro(s)</div>
                <div className="muted">
                  {selected.location.lat.toFixed(5)}, {selected.location.lng.toFixed(5)}
                </div>
                {selected.routeName ? (
                  <div>
                    Rota: {selected.routeName} (parada {selected.order})
                    {selected.etaSeconds !== undefined && (
                      <> — chegada {formatClock(selected.etaSeconds)}</>
                    )}
                  </div>
                ) : (
                  <div className="muted">Ainda não alocado a nenhuma rota</div>
                )}
              </>
            )}

            {selected.kind === "origin" && (
              <>
                <strong>
                  {selected.route.originMode === "firstPassenger" ? "Origem calculada: " : "Origem: "}
                  {selected.route.name}
                </strong>
                <div>Capacidade: {selected.route.capacity} passageiro(s)</div>
                {selected.route.originMode === "firstPassenger" ? (
                  <div className="muted">
                    Sem depósito fixo — começa no passageiro mais eficiente
                  </div>
                ) : (
                  <div className="muted">
                    Depósito: {selected.route.depotLat.toFixed(5)}, {selected.route.depotLng.toFixed(5)}
                  </div>
                )}
                <div>
                  {destination
                    ? `Destino: ${destination.name}`
                    : selected.route.originMode === "firstPassenger"
                      ? "Termina na última parada"
                      : selected.route.returnToDepot
                        ? "Retorna ao depósito ao final"
                        : "Não retorna ao depósito"}
                </div>
                {selected.optimized ? (
                  <div>
                    {selected.optimized.stops.length} parada(s),{" "}
                    {formatDistance(selected.optimized.totalDistanceMeters)},{" "}
                    {formatDuration(selected.optimized.totalDurationSeconds)}
                    {selected.optimized.finalArrivalSeconds !== undefined && (
                      <> — chegada {formatClock(selected.optimized.finalArrivalSeconds)}</>
                    )}
                  </div>
                ) : (
                  <div className="muted">Ainda não otimizado</div>
                )}
              </>
            )}

            {selected.kind === "destination" && (
              <>
                <strong>Destino: {selected.route.name}</strong>
                <div>
                  Última parada:{" "}
                  {selected.optimized.stops[selected.optimized.stops.length - 1]?.name}
                </div>
                <div className="muted">
                  {selected.optimized.stops.length} parada(s) no total,{" "}
                  {formatDistance(selected.optimized.totalDistanceMeters)},{" "}
                  {formatDuration(selected.optimized.totalDurationSeconds)}
                </div>
              </>
            )}

            {selected.kind === "autoOrigin" && (
              <>
                <strong>{selected.optimized.routeName}</strong>
                <div className="muted">Origem escolhida automaticamente (sem depósito fixo)</div>
                <div>
                  {selected.optimized.stops.length} parada(s),{" "}
                  {formatDistance(selected.optimized.totalDistanceMeters)},{" "}
                  {formatDuration(selected.optimized.totalDurationSeconds)}
                  {selected.optimized.finalArrivalSeconds !== undefined && (
                    <> — chegada {formatClock(selected.optimized.finalArrivalSeconds)}</>
                  )}
                </div>
                {selected.optimized.destination?.name && (
                  <div>Destino: {selected.optimized.destination.name}</div>
                )}
              </>
            )}

            {selected.kind === "globalDestination" && (
              <>
                <strong>Destino final: {selected.destination.name}</strong>
                <div className="muted">
                  {selected.destination.lat.toFixed(5)}, {selected.destination.lng.toFixed(5)}
                </div>
                <div>Todas as rotas terminam aqui.</div>
              </>
            )}
          </div>
        </InfoWindow>
      )}

      {result?.routes.map((route) =>
        route.directions.available && route.directions.encodedPolyline ? (
          <Polyline
            key={route.routeId}
            path={decodePolyline(route.directions.encodedPolyline)}
            options={{
              strokeColor: colorByRouteId.get(route.routeId) ?? "#888888",
              strokeWeight: 4,
            }}
          />
        ) : null
      )}
      </GoogleMap>
    </div>
  );
}
