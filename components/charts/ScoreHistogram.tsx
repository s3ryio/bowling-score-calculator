import type { ScoreBin } from "@/lib/bowling-charts";

interface ScoreHistogramProps {
  bins: ScoreBin[];
  ariaLabel?: string;
}

const ACCENT_BY_BIN: Record<string, string> = {
  "0–49": "rgba(244, 63, 94, 0.7)",
  "50–99": "rgba(251, 113, 133, 0.7)",
  "100–149": "rgba(251, 191, 36, 0.75)",
  "150–199": "rgba(132, 204, 22, 0.75)",
  "200–249": "rgba(34, 211, 238, 0.8)",
  "250–299": "rgba(96, 165, 250, 0.85)",
  "300": "rgba(217, 70, 239, 0.9)",
  "300+": "rgba(251, 191, 36, 0.9)",
};

export function ScoreHistogram({ bins, ariaLabel = "Distribución de puntuaciones" }: ScoreHistogramProps) {
  const total = bins.reduce((sum, bin) => sum + bin.count, 0);

  if (total === 0) {
    return (
      <div className="grid h-32 place-items-center rounded-lg border border-dashed border-white/15 text-xs text-white/45">
        Guarda partidas para ver la distribución
      </div>
    );
  }

  const maxCount = Math.max(...bins.map((bin) => bin.count), 1);

  return (
    <div aria-label={ariaLabel} className="flex h-36 items-end gap-2" role="group">
      {bins.map((bin) => {
        const heightPct = (bin.count / maxCount) * 100;
        const label = `${bin.label}: ${bin.count} ${bin.count === 1 ? "partida" : "partidas"}`;
        return (
          <div className="flex h-full flex-1 flex-col items-center justify-end gap-1" key={bin.label}>
            <span className="text-[10px] font-bold text-white/55">{bin.count > 0 ? bin.count : ""}</span>
            <div
              aria-label={label}
              className="w-full rounded-t-md transition-[height]"
              role="img"
              style={{
                height: `${Math.max(heightPct, bin.count > 0 ? 6 : 1.5)}%`,
                background: ACCENT_BY_BIN[bin.label] ?? "rgba(148, 163, 184, 0.5)",
                minHeight: bin.count > 0 ? 6 : 2,
              }}
              title={label}
            />
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
              {bin.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
