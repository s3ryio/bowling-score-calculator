import type { EvolutionPoint } from "@/lib/bowling-charts";

interface SparklineProps {
  points: EvolutionPoint[];
  /** Altura en px (el ancho es 100% del contenedor). */
  height?: number;
  /** Color principal de la línea. CSS color o variable. */
  stroke?: string;
  /** Etiqueta accesible. */
  ariaLabel?: string;
}

const VIEWBOX_WIDTH = 100;
const VIEWBOX_HEIGHT = 40;
const PADDING = 3;

function formatDate(value: string): string {
  try {
    return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}

export function Sparkline({
  points,
  height = 96,
  stroke = "currentColor",
  ariaLabel = "Evolución de puntuación",
}: SparklineProps) {
  if (points.length === 0) {
    return (
      <div
        className="grid h-24 place-items-center rounded-lg border border-dashed border-white/15 text-xs text-white/45"
        style={{ height }}
      >
        Sin datos suficientes
      </div>
    );
  }

  const scores = points.map((point) => point.score);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const range = Math.max(1, maxScore - minScore);
  const usableHeight = VIEWBOX_HEIGHT - PADDING * 2;
  const usableWidth = VIEWBOX_WIDTH - PADDING * 2;

  const coords = points.map((point, index) => {
    const x =
      points.length === 1
        ? VIEWBOX_WIDTH / 2
        : PADDING + (index / (points.length - 1)) * usableWidth;
    const y = PADDING + (1 - (point.score - minScore) / range) * usableHeight;
    return { x, y, point };
  });

  const linePath = coords
    .map((coord, index) => `${index === 0 ? "M" : "L"} ${coord.x.toFixed(2)} ${coord.y.toFixed(2)}`)
    .join(" ");

  const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(2)} ${VIEWBOX_HEIGHT - PADDING} L ${coords[0].x.toFixed(2)} ${VIEWBOX_HEIGHT - PADDING} Z`;

  const last = coords[coords.length - 1];
  const summary = `${points.length} partidas. Mejor ${maxScore}. Última ${last.point.score}.`;

  return (
    <div className="relative w-full" style={{ height }}>
      <svg
        aria-label={`${ariaLabel}. ${summary}`}
        className="h-full w-full"
        preserveAspectRatio="none"
        role="img"
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      >
        <defs>
          <linearGradient id="sparkline-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.32" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#sparkline-fill)" />
        <path
          d={linePath}
          fill="none"
          stroke={stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.2"
          vectorEffect="non-scaling-stroke"
        />
        {coords.map((coord) => (
          <circle
            cx={coord.x}
            cy={coord.y}
            fill={stroke}
            key={`${coord.point.index}-${coord.point.date}`}
            r="0.8"
            vectorEffect="non-scaling-stroke"
          >
            <title>
              {formatDate(coord.point.date)} · {coord.point.score} puntos
            </title>
          </circle>
        ))}
        <circle
          cx={last.x}
          cy={last.y}
          fill={stroke}
          r="1.4"
          stroke="white"
          strokeOpacity="0.85"
          strokeWidth="0.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="pointer-events-none absolute inset-x-0 -bottom-1 flex justify-between text-[10px] font-bold uppercase tracking-wider text-white/40">
        <span>min {minScore}</span>
        <span>max {maxScore}</span>
      </div>
    </div>
  );
}
