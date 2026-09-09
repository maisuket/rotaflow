import { MarkerShape } from "../utils/shapes";

/**
 * Versao SVG inline (nao depende do Maps JS carregado) da mesma forma usada
 * nos marcadores do mapa — usada em listas/legendas pra associar o nome da
 * rota a forma+cor, nao so a cor (ver `shapes.ts`).
 */
export function RouteShapeIcon({ shape, color, size = 14 }: { shape: MarkerShape; color: string; size?: number }) {
  if (shape.kind === "circle") {
    return (
      <svg width={size} height={size} viewBox="-10 -10 20 20" aria-hidden="true">
        <circle cx={0} cy={0} r={8} fill={color} stroke="#000" strokeWidth={1} />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="-10 -10 20 20" aria-hidden="true">
      <path d={shape.path} fill={color} stroke="#000" strokeWidth={1} />
    </svg>
  );
}
