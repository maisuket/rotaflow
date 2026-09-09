/**
 * Formas de marcador distintas por rota, para nao depender so da cor pra
 * diferenciar rotas no mapa (util pra quem tem daltonismo). Emparelhado
 * 1-para-1 com `colorForRouteIndex` — mesmo indice, mesma rota.
 */
export type MarkerShape =
  | { kind: "circle" }
  | { kind: "path"; path: string; scale: number };

const SQUARE = "M -7,-7 7,-7 7,7 -7,7 Z";
const TRIANGLE_UP = "M 0,-9 8,7 -8,7 Z";
const DIAMOND = "M 0,-9 9,0 0,9 -9,0 Z";
const PENTAGON = "M 0,-9 8.6,-2.8 5.3,7.3 -5.3,7.3 -8.6,-2.8 Z";
const CROSS =
  "M -2.5,-8 2.5,-8 2.5,-2.5 8,-2.5 8,2.5 2.5,2.5 2.5,8 -2.5,8 -2.5,2.5 -8,2.5 -8,-2.5 -2.5,-2.5 Z";
const HEXAGON = "M -8,0 -4,-7 4,-7 8,0 4,7 -4,7 Z";
const TRIANGLE_DOWN = "M 0,9 8,-7 -8,-7 Z";
const STAR =
  "M 0,-9 2.6,-2.8 9,-2.8 4,1.1 5.9,7.3 0,3.6 -5.9,7.3 -4,1.1 -9,-2.8 -2.6,-2.8 Z";
const OCTAGON = "M -3,-8 3,-8 8,-3 8,3 3,8 -3,8 -8,3 -8,-3 Z";

const SHAPES: MarkerShape[] = [
  { kind: "circle" },
  { kind: "path", path: SQUARE, scale: 1 },
  { kind: "path", path: TRIANGLE_UP, scale: 1 },
  { kind: "path", path: DIAMOND, scale: 1 },
  { kind: "path", path: PENTAGON, scale: 1 },
  { kind: "path", path: CROSS, scale: 1 },
  { kind: "path", path: HEXAGON, scale: 1 },
  { kind: "path", path: TRIANGLE_DOWN, scale: 1 },
  { kind: "path", path: STAR, scale: 1 },
  { kind: "path", path: OCTAGON, scale: 1 },
];

export function shapeForRouteIndex(index: number): MarkerShape {
  return SHAPES[index % SHAPES.length];
}

/** Monta o objeto `icon` do google.maps.Marker para uma forma+cor dadas. */
export function markerIconForShape(shape: MarkerShape, color: string) {
  if (shape.kind === "circle") {
    return {
      path: window.google.maps.SymbolPath.CIRCLE,
      scale: 8,
      fillColor: color,
      fillOpacity: 1,
      strokeColor: "#000",
      strokeWeight: 1,
    };
  }
  return {
    path: shape.path,
    scale: shape.scale,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: "#000",
    strokeWeight: 1,
  };
}
