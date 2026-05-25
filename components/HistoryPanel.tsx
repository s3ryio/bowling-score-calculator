"use client";

import { useMemo, useState } from "react";
import { Eye, Filter, History, Search, Trash2 } from "lucide-react";

import { ShareResultButton } from "@/components/ShareResultButton";
import { compareSavedGames, filterHistory } from "@/lib/bowling-analytics";
import type { SavedGame } from "@/types/bowling";

interface HistoryPanelProps {
  history: SavedGame[];
  isReady: boolean;
  onClear: () => void;
  onSelect: (game: SavedGame) => void;
  selectedGame: SavedGame | null;
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function formatPlayerScore(player: SavedGame["players"][number]): string {
  const final = player.adjustedScore ?? player.score;
  const handicap = player.handicap && player.handicap > 0 ? ` (${player.score} +${player.handicap})` : "";
  return `${player.name}: ${final}${handicap}`;
}

export function HistoryPanel({ history, isReady, onClear, onSelect, selectedGame }: HistoryPanelProps) {
  const [query, setQuery] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [onlyPerfect, setOnlyPerfect] = useState(false);
  const filteredHistory = useMemo(
    () => filterHistory(history, { query, minScore, onlyPerfect }),
    [history, minScore, onlyPerfect, query],
  );
  const bestGame = useMemo(
    () => history.reduce<SavedGame | null>((best, game) => (!best || game.winningScore > best.winningScore ? game : best), null),
    [history],
  );
  const comparison =
    selectedGame && bestGame ? compareSavedGames(selectedGame, bestGame) : null;

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex items-center gap-2 text-white">
            <History size={18} className="text-cyan-200" />
            <h2 className="text-lg font-black">Historial</h2>
          </div>
          <p className="text-sm text-white/45">Partidas completas guardadas en este dispositivo.</p>
        </div>
        <button
          aria-label="Borrar historial"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/10 bg-black/35 text-white transition hover:border-rose-300/60 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-35"
          disabled={history.length === 0}
          onClick={onClear}
          title="Borrar historial"
          type="button"
        >
          <Trash2 size={17} />
        </button>
      </div>

      <div className="mb-4 rounded-lg border border-white/10 bg-black/25 p-3">
        <label className="flex h-11 items-center gap-2 rounded-lg border border-white/10 bg-black/35 px-3 text-sm text-white/55">
          <Search size={16} className="text-cyan-200" />
          <span className="sr-only">Buscar jugador</span>
          <input
            className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-white/30"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar jugador"
            value={query}
          />
        </label>

        <div className="mt-3 flex flex-wrap gap-2">
          {[0, 150, 200, 250].map((score) => (
            <button
              className={[
                "inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-black transition",
                minScore === score
                  ? "border-cyan-300 bg-cyan-300 text-black"
                  : "border-white/10 bg-white/[0.06] text-white/65 hover:border-cyan-300/60",
              ].join(" ")}
              key={score}
              onClick={() => setMinScore(score)}
              type="button"
            >
              <Filter size={14} />
              {score === 0 ? "Todas" : `${score}+`}
            </button>
          ))}
          <button
            className={[
              "h-9 rounded-lg border px-3 text-xs font-black transition",
              onlyPerfect
                ? "border-amber-200 bg-amber-200 text-black"
                : "border-white/10 bg-white/[0.06] text-white/65 hover:border-amber-200/60",
            ].join(" ")}
            onClick={() => setOnlyPerfect((current) => !current)}
            type="button"
          >
            Perfectas
          </button>
        </div>
      </div>

      {!isReady && <p className="text-sm text-white/45">Cargando historial…</p>}

      {isReady && history.length === 0 && (
        <div className="rounded-lg border border-dashed border-white/15 p-4 text-sm text-white/45">
          Aún no hay partidas guardadas.
        </div>
      )}

      {isReady && history.length > 0 && filteredHistory.length === 0 && (
        <div className="rounded-lg border border-dashed border-white/15 p-4 text-sm text-white/45">
          No hay partidas que encajen con esos filtros.
        </div>
      )}

      <div className="space-y-2">
        {filteredHistory.map((game) => (
          <button
            className={[
              "w-full rounded-lg border p-3 text-left transition hover:border-cyan-300/50",
              selectedGame?.id === game.id ? "border-cyan-300/60 bg-cyan-300/[0.08]" : "border-white/10 bg-black/30",
            ].join(" ")}
            key={game.id}
            onClick={() => onSelect(game)}
            type="button"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-white">{formatDate(game.date)}</p>
                <p className="mt-1 text-sm text-white/45">
                  {game.players.map(formatPlayerScore).join(" · ")}
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-md bg-white/10 px-2 py-1 text-sm font-black text-amber-200">
                <Eye size={15} />
                {game.winningScore}
              </span>
            </div>
          </button>
        ))}
      </div>

      {selectedGame && (
        <div className="mt-4 rounded-lg border border-cyan-300/25 bg-cyan-300/[0.07] p-3">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-100/65">Vista anterior</p>
          <p className="mt-1 font-black text-white">{formatDate(selectedGame.date)}</p>
          <div className="mt-3 space-y-2">
            {selectedGame.players.map((player, index) => (
              <div className="rounded-md bg-black/30 p-2" key={player.id}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white/80">
                    {index + 1}. {player.name}
                  </span>
                  <span className="font-black text-amber-200">{player.adjustedScore ?? player.score}</span>
                </div>
                <p className="mt-1 text-xs text-white/45">{player.summary}</p>
              </div>
            ))}
          </div>
          {comparison && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-md bg-black/30 p-2">
                <p className="text-xs text-white/40">Vs mejor</p>
                <p className="text-lg font-black text-amber-200">
                  {comparison.scoreDelta > 0 ? "+" : ""}
                  {comparison.scoreDelta}
                </p>
              </div>
              <div className="rounded-md bg-black/30 p-2">
                <p className="text-xs text-white/40">Strikes</p>
                <p className="text-lg font-black text-lime-200">
                  {comparison.strikeDelta > 0 ? "+" : ""}
                  {comparison.strikeDelta}
                </p>
              </div>
              <div className="rounded-md bg-black/30 p-2">
                <p className="text-xs text-white/40">Spares</p>
                <p className="text-lg font-black text-blue-200">
                  {comparison.spareDelta > 0 ? "+" : ""}
                  {comparison.spareDelta}
                </p>
              </div>
            </div>
          )}
          <div className="mt-3">
            <ShareResultButton game={selectedGame} />
          </div>
        </div>
      )}
    </section>
  );
}
