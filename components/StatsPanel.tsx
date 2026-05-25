import { useMemo } from "react";
import { Activity, BarChart3, Flame, LineChart, Medal, Percent, Sigma, Zap } from "lucide-react";

import { FrameHeatmap } from "@/components/charts/FrameHeatmap";
import { ScoreHistogram } from "@/components/charts/ScoreHistogram";
import { Sparkline } from "@/components/charts/Sparkline";
import { getPlayerStats } from "@/lib/bowling-analytics";
import {
  frameAverageHeatmap,
  scoreDistribution,
  scoreEvolutionSeries,
} from "@/lib/bowling-charts";
import type { BowlingStats, SavedGame } from "@/types/bowling";

interface StatsPanelProps {
  history: SavedGame[];
  stats: BowlingStats;
}

export function StatsPanel({ history, stats }: StatsPanelProps) {
  const playerStats = getPlayerStats(history);
  const evolution = useMemo(() => scoreEvolutionSeries(history, { limit: 20 }), [history]);
  const heatmap = useMemo(() => frameAverageHeatmap(history), [history]);
  const distribution = useMemo(() => scoreDistribution(history), [history]);

  const items = [
    { label: "Mejor", value: stats.bestScore, icon: Medal, tone: "text-amber-200" },
    { label: "Media", value: stats.averageScore, icon: BarChart3, tone: "text-cyan-200" },
    { label: "Partidas", value: stats.gamesPlayed, icon: Activity, tone: "text-emerald-200" },
    { label: "Strikes", value: stats.totalStrikes, icon: Zap, tone: "text-lime-200" },
    { label: "Spares", value: stats.totalSpares, icon: Sigma, tone: "text-blue-200" },
    { label: "Strike %", value: `${stats.strikePercentage}%`, icon: Percent, tone: "text-rose-200" },
  ];

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
      <div className="mb-4">
        <h2 className="text-lg font-black text-white">Estadísticas</h2>
        <p className="text-sm text-white/45">Calculadas desde el historial local.</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <div className="rounded-lg border border-white/10 bg-black/30 p-3" key={item.label}>
              <Icon aria-hidden="true" className={item.tone} size={18} />
              <p className="mt-3 text-2xl font-black text-white">{item.value}</p>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/40">{item.label}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-3 rounded-lg border border-white/10 bg-black/25 p-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/50">Spare %</span>
          <span className="font-black text-blue-200">{stats.sparePercentage}%</span>
        </div>
      </div>

      <div className="mt-4 border-t border-white/10 pt-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-white/50">
          <LineChart aria-hidden="true" size={14} />
          Evolución
        </h3>
        <div className="rounded-lg border border-white/10 bg-black/30 p-3 pb-5 text-cyan-300">
          <Sparkline
            ariaLabel="Evolución de la puntuación en las últimas 20 partidas"
            points={evolution}
            stroke="currentColor"
          />
        </div>
      </div>

      <div className="mt-4 border-t border-white/10 pt-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-white/50">
          <Flame aria-hidden="true" size={14} />
          Promedio por frame
        </h3>
        <div className="rounded-lg border border-white/10 bg-black/20 p-3">
          <FrameHeatmap data={heatmap} />
          <p className="mt-2 text-[10px] text-white/35">
            Tono = puntuación media con bonificaciones del frame.
          </p>
        </div>
      </div>

      <div className="mt-4 border-t border-white/10 pt-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-white/50">
          <BarChart3 aria-hidden="true" size={14} />
          Distribución de puntuaciones
        </h3>
        <div className="rounded-lg border border-white/10 bg-black/20 p-3">
          <ScoreHistogram bins={distribution} />
        </div>
      </div>

      <div className="mt-4 border-t border-white/10 pt-4">
        <h3 className="text-sm font-black uppercase tracking-[0.16em] text-white/50">Por jugador</h3>
        {playerStats.length === 0 ? (
          <div className="mt-3 rounded-lg border border-dashed border-white/15 p-4 text-sm text-white/45">
            Guarda partidas para ver rendimiento por jugador.
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {playerStats.slice(0, 5).map((player) => (
              <article className="rounded-lg border border-white/10 bg-black/30 p-3" key={player.name}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-black text-white">{player.name}</p>
                    <p className="text-xs text-white/45">
                      {player.gamesPlayed} partidas · Última {player.lastScore}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-amber-200">{player.bestScore}</p>
                    <p className="text-xs text-white/40">mejor</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-md bg-white/[0.06] p-2">
                    <p className="text-white/35">Media</p>
                    <p className="font-black text-cyan-100">{player.averageScore}</p>
                  </div>
                  <div className="rounded-md bg-white/[0.06] p-2">
                    <p className="text-white/35">Strike %</p>
                    <p className="font-black text-lime-100">{player.strikePercentage}%</p>
                  </div>
                  <div className="rounded-md bg-white/[0.06] p-2">
                    <p className="text-white/35">Spare %</p>
                    <p className="font-black text-blue-100">{player.sparePercentage}%</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {stats.recentGames.length > 0 && (
        <div className="mt-4 border-t border-white/10 pt-4">
          <h3 className="text-sm font-black uppercase tracking-[0.16em] text-white/50">Forma reciente</h3>
          <div className="mt-3 flex h-24 items-end gap-2">
            {stats.recentGames.map((game) => (
              <div className="flex flex-1 flex-col items-center gap-2" key={game.id}>
                <div
                  aria-label={`Puntuación ganadora ${game.winningScore}`}
                  className="w-full rounded-t-md bg-gradient-to-t from-cyan-400 to-amber-200"
                  role="img"
                  style={{ height: `${Math.max(10, Math.round((game.winningScore / 300) * 100))}%` }}
                />
                <span className="text-xs font-black text-white/60">{game.winningScore}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
