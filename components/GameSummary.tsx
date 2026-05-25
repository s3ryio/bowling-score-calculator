import { Save, Sparkles, Trophy, UsersRound } from "lucide-react";

import { calculateGameScore } from "@/lib/bowling-score";
import { getGameStatus, getWinningScore, isGameFinished, rankPlayers } from "@/lib/bowling-game";
import type { BowlingGame } from "@/types/bowling";

interface GameSummaryProps {
  bestScore: number;
  game: BowlingGame;
  onSave: () => void;
}

const statusCopy = {
  "in-progress": { label: "En progreso", tone: "text-cyan-200", detail: "Sigue el turno marcado." },
  complete: { label: "Partida completa", tone: "text-emerald-200", detail: "Lista para guardar." },
  perfect: { label: "Partida perfecta", tone: "text-amber-200", detail: "300. Impecable." },
  "new-best": { label: "Nueva mejor marca", tone: "text-lime-200", detail: "Supera tu historial local." },
};

export function GameSummary({ bestScore, game, onSave }: GameSummaryProps) {
  const activePlayer = game.players[game.activePlayerIndex] ?? game.players[0];
  const activeScore = calculateGameScore(activePlayer.rolls);
  const finished = isGameFinished(game);
  const status = getGameStatus(game, bestScore);
  const statusInfo = statusCopy[status];
  const ranking = rankPlayers(game.players, game.mode, game.playerHandicaps);
  const mainScore = finished ? getWinningScore(game) : activeScore.total;
  const hasHandicap =
    game.handicap.enabled &&
    Object.values(game.playerHandicaps).some((value) => value > 0);

  return (
    <section
      className="rounded-lg border border-white/10 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.34)]"
      style={{ background: "var(--summary-gradient)" }}
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white/65">
              <Sparkles size={15} className="text-amber-200" />
              <span className={statusInfo.tone}>{statusInfo.label}</span>
              <span className="hidden text-white/35 sm:inline">·</span>
              <span className="hidden sm:inline">{statusInfo.detail}</span>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-2.5 py-1 text-xs font-black uppercase tracking-wider text-cyan-100">
              Oficial 10-pin
            </span>
            {hasHandicap && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-2.5 py-1 text-xs font-black uppercase tracking-wider text-emerald-100">
                Handicap activo
              </span>
            )}
          </div>
          <h1 className="text-3xl font-black leading-tight text-white sm:text-5xl">
            Bowling Score Calculator
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55 sm:text-base">
            Marcador oficial de 10 frames, cómodo para móvil y con historial local.
          </p>
        </div>

        <div className="flex items-end justify-between gap-4 md:block md:text-right">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">
              {finished ? "Puntuación ganadora" : activePlayer.name}
            </p>
            <p className="text-6xl font-black leading-none text-amber-200 sm:text-7xl">{mainScore}</p>
          </div>
          <button
            className="inline-flex h-12 items-center gap-2 rounded-lg border border-emerald-300/35 bg-emerald-300 px-4 font-black text-black transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-35"
            disabled={!finished || Boolean(game.savedAt)}
            onClick={onSave}
            type="button"
          >
            <Save size={18} />
            <span>{game.savedAt ? "Guardada" : "Guardar"}</span>
          </button>
        </div>
      </div>

      {game.players.length > 1 && (
        <div className="mt-5 border-t border-white/10 pt-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-white/50">
            <UsersRound size={16} />
            Ranking
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {ranking.map((player, index) => {
              const handicap = player.handicap ?? 0;
              const final = player.adjustedScore ?? player.score;
              return (
                <div className="flex items-center justify-between rounded-lg bg-black/30 px-3 py-2" key={player.id}>
                  <span className="flex items-center gap-2 text-sm font-semibold text-white/75">
                    {index === 0 ? <Trophy size={16} className="text-amber-200" /> : <span>{index + 1}</span>}
                    {player.name}
                  </span>
                  <span className="text-right">
                    <span className="block font-black text-white">{final}</span>
                    {handicap > 0 && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200">
                        {player.score} + {handicap}
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
