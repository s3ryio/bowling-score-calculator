"use client";

import { Scale } from "lucide-react";

import type { BowlingGame, HandicapConfig } from "@/types/bowling";

interface HandicapPanelProps {
  game: BowlingGame;
  onChange: (next: HandicapConfig) => void;
}

export function HandicapPanel({ game, onChange }: HandicapPanelProps) {
  const config = game.handicap;
  const playerEntries = game.players.map((player) => ({
    id: player.id,
    name: player.name.trim() || "Jugador",
    handicap: game.playerHandicaps[player.id] ?? game.playerHandicaps[player.name] ?? 0,
  }));
  const hasAnyHandicap = playerEntries.some((entry) => entry.handicap > 0);

  return (
    <section
      aria-label="Configuración de handicap"
      className="rounded-lg border border-white/10 bg-white/[0.045] p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-white">
            <Scale aria-hidden="true" className="text-emerald-200" size={18} />
            <h2 className="text-lg font-black">Handicap</h2>
          </div>
          <p className="text-sm text-white/45">
            Iguala niveles entre jugadores sumando puntos en función de su media histórica.
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-white/70">
          <input
            aria-label="Activar handicap"
            checked={config.enabled}
            className="h-5 w-9 cursor-pointer appearance-none rounded-full bg-white/15 transition checked:bg-emerald-400 focus-visible:outline-none"
            onChange={(event) => onChange({ ...config, enabled: event.target.checked })}
            style={{
              backgroundImage:
                "radial-gradient(circle at var(--knob, 6px) center, white 0 7px, transparent 7.5px)",
            }}
            type="checkbox"
          />
          <span>{config.enabled ? "On" : "Off"}</span>
        </label>
      </div>

      {config.enabled && (
        <>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-white/40">
                Score objetivo
              </span>
              <input
                aria-label="Score objetivo"
                className="h-10 w-full rounded-lg border border-white/10 bg-black/35 px-2 text-sm font-bold text-white outline-none transition focus:border-emerald-300/70"
                max={300}
                min={50}
                onChange={(event) =>
                  onChange({
                    ...config,
                    targetScore: Number.parseInt(event.target.value, 10) || config.targetScore,
                  })
                }
                step={10}
                type="number"
                value={config.targetScore}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-white/40">
                % aplicado
              </span>
              <input
                aria-label="Porcentaje aplicado"
                className="h-10 w-full rounded-lg border border-white/10 bg-black/35 px-2 text-sm font-bold text-white outline-none transition focus:border-emerald-300/70"
                max={100}
                min={0}
                onChange={(event) =>
                  onChange({
                    ...config,
                    percentage: Number.parseInt(event.target.value, 10) || 0,
                  })
                }
                step={10}
                type="number"
                value={config.percentage}
              />
            </label>
          </div>

          <div className="rounded-lg border border-white/10 bg-black/25 p-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-white/40">
              Handicap por jugador
            </p>
            <div className="space-y-1.5">
              {playerEntries.map((entry) => (
                <div className="flex items-center justify-between text-sm" key={entry.id}>
                  <span className="text-white/75">{entry.name}</span>
                  <span
                    className={`font-black ${entry.handicap > 0 ? "text-emerald-200" : "text-white/35"}`}
                  >
                    {entry.handicap > 0 ? `+${entry.handicap}` : "—"}
                  </span>
                </div>
              ))}
            </div>
            {!hasAnyHandicap && (
              <p className="mt-3 text-xs text-white/35">
                Los handicaps se calcularán cuando guardes partidas en el historial (se necesita una
                media por jugador).
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
