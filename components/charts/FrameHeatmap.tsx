import type { FrameAverage } from "@/lib/bowling-charts";

interface FrameHeatmapProps {
  data: FrameAverage[];
  /** Valor máximo esperado en el gradiente (30 puntos en un frame bonificado). */
  maxValue?: number;
  ariaLabel?: string;
}

const MAX_FRAME_SCORE = 30;

function intensity(score: number, max: number): number {
  if (max <= 0) {
    return 0;
  }
  return Math.min(1, Math.max(0, score / max));
}

export function FrameHeatmap({
  data,
  maxValue = MAX_FRAME_SCORE,
  ariaLabel = "Promedio por frame",
}: FrameHeatmapProps) {
  const hasData = data.some((frame) => frame.samples > 0);

  if (!hasData) {
    return (
      <div className="grid h-24 place-items-center rounded-lg border border-dashed border-white/15 text-xs text-white/45">
        Juega más partidas para ver el promedio por frame
      </div>
    );
  }

  return (
    <div
      aria-label={ariaLabel}
      className="grid grid-cols-10 gap-1"
      role="group"
    >
      {data.map((frame) => {
        const value = intensity(frame.averageScore, maxValue);
        const hasSamples = frame.samples > 0;
        const label = hasSamples
          ? `Frame ${frame.frameNumber}: media ${frame.averageScore} en ${frame.samples} muestras`
          : `Frame ${frame.frameNumber}: sin datos`;

        return (
          <div className="flex flex-col items-center" key={frame.frameNumber}>
            <div
              aria-label={label}
              className="grid h-12 w-full place-items-center rounded-md border border-white/10 text-xs font-black"
              role="img"
              style={{
                background: hasSamples
                  ? `linear-gradient(180deg, rgba(251, 191, 36, ${0.18 + value * 0.6}) 0%, rgba(34, 211, 238, ${0.12 + value * 0.45}) 100%)`
                  : "rgba(15, 23, 42, 0.25)",
                color: hasSamples ? "#fff" : "rgba(255,255,255,0.4)",
              }}
              title={label}
            >
              {hasSamples ? frame.averageScore : "·"}
            </div>
            <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-white/40">
              {frame.frameNumber}
            </span>
          </div>
        );
      })}
    </div>
  );
}
