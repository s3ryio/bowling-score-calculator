import { Medal, Plus, Save, Trophy } from "lucide-react";

import { ShareResultButton } from "@/components/ShareResultButton";
import { rankPlayers } from "@/lib/bowling-game";
import type { BowlingGame } from "@/types/bowling";

interface GameOverPanelProps {
  game: BowlingGame;
  onNewGame: () => void;
  onSave: () => void;
}

export function GameOverPanel({ game, onNewGame, onSave }: GameOverPanelProps) {
  const ranking = rankPlayers(game.players, game.mode, game.playerHandicaps);
  const winner = ranking[0];
  const winnerFinal = winner ? winner.adjustedScore ?? winner.score : 0;
  const shareGame = {
    id: game.id,
    date: game.savedAt ?? game.createdAt,
    players: ranking,
    winningScore: winnerFinal,
    mode: game.mode,
  };

  return (
    <section
      className="overflow-hidden rounded-lg border border-amber-200/25 shadow-[0_26px_90px_rgba(0,0,0,0.38)]"
      style={{ background: "var(--gameover-gradient)" }}
    >
      <div className="relative p-5">
        <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-amber-300/10 blur-3xl" />
        <div className="relative">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-lg border border-amber-200/25 bg-amber-200/10 px-3 py-2 text-sm font-bold text-amber-100">
              <Trophy size={17} />
              Resultado final
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-2.5 py-1 text-xs font-black uppercase tracking-wider text-cyan-100">
              Oficial 10-pin
            </span>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-white/45">Ganador</p>
              <h2 className="mt-1 text-3xl font-black text-white">{winner?.name ?? "Partida completa"}</h2>
              <p className="mt-2 text-sm text-white/50">Resumen listo para guardar en tu historial local.</p>
            </div>
            <p className="text-6xl font-black leading-none text-amber-200">{winnerFinal}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-2 border-y border-white/10 bg-black/20 p-4 md:grid-cols-2 xl:grid-cols-3">
        {ranking.map((player, index) => {
          const handicap = player.handicap ?? 0;
          const final = player.adjustedScore ?? player.score;
          return (
            <article className="rounded-lg border border-white/10 bg-black/30 p-3" key={player.id}>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 font-bold text-white">
                  <Medal className={index === 0 ? "text-amber-200" : "text-white/35"} size={18} />
                  {index + 1}. {player.name}
                </span>
                <span className="text-right">
                  <span className="block text-xl font-black text-amber-200">{final}</span>
                  {handicap > 0 && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200">
                      {player.score} + {handicap}
                    </span>
                  )}
                </span>
              </div>
              <p className="mt-2 truncate text-xs text-white/40">{player.summary}</p>
            </article>
          );
        })}
      </div>

      <div className="grid gap-2 p-4 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <ShareResultButton game={shareGame} />
        </div>
        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-emerald-300/35 bg-emerald-300 px-4 font-black text-black transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-45"
          disabled={Boolean(game.savedAt)}
          onClick={onSave}
          type="button"
        >
          <Save size={18} />
          {game.savedAt ? "Guardada" : "Guardar partida"}
        </button>
        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/10 px-4 font-black text-white transition hover:border-cyan-300/60 hover:bg-cyan-300/10"
          onClick={onNewGame}
          type="button"
        >
          <Plus size={18} />
          Nueva partida
        </button>
      </div>
    </section>
  );
}
