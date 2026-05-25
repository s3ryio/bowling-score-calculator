"use client";

import { Crown, Minus, Plus, UserRound } from "lucide-react";

import { calculateGameScore } from "@/lib/bowling-score";
import type { BowlingGame, FrameScore } from "@/types/bowling";

interface BowlingScoreboardTableProps {
  game: BowlingGame;
  finished: boolean;
  winnerIds?: string[];
  onNameChange: (playerId: string, name: string) => void;
  onAddPlayer: () => void;
  onRemovePlayer: () => void;
  maxPlayers?: number;
  minPlayers?: number;
  lockedPlayerIds?: string[];
}

const FRAMES = Array.from({ length: 10 }, (_, i) => i + 1);

export function BowlingScoreboardTable({
  game,
  finished,
  winnerIds = [],
  onNameChange,
  onAddPlayer,
  onRemovePlayer,
  maxPlayers = 6,
  minPlayers = 1,
  lockedPlayerIds = [],
}: BowlingScoreboardTableProps) {
  const activeIndex = game.activePlayerIndex;
  const playerScores = game.players.map((player) => ({
    player,
    score: calculateGameScore(player.rolls),
  }));
  const activePlayerScore = playerScores[activeIndex]?.score;
  const activeFrameNumber = activePlayerScore && !finished ? activePlayerScore.currentFrameIndex + 1 : null;

  return (
    <section
      aria-label="Marcador completo"
      className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.045] shadow-[0_24px_90px_rgba(0,0,0,0.24)]"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-black/25 px-4 py-3">
        <div>
          <h2 className="text-sm font-black uppercase tracking-[0.18em] text-white/65">Marcador</h2>
          <p className="text-xs text-white/45">
            {game.players.length} {game.players.length === 1 ? "jugador" : "jugadores"}
            {activeFrameNumber ? ` · Frame ${activeFrameNumber} en juego` : finished ? " · Partida completa" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            aria-label="Quitar último jugador"
            className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-black/35 text-white transition hover:border-cyan-300/60 disabled:cursor-not-allowed disabled:opacity-35"
            disabled={game.players.length <= minPlayers}
            onClick={onRemovePlayer}
            title="Quitar jugador"
            type="button"
          >
            <Minus aria-hidden="true" size={16} />
          </button>
          <span className="min-w-9 rounded-lg border border-white/10 bg-black/35 px-3 py-1.5 text-center text-sm font-bold text-white">
            {game.players.length}
          </span>
          <button
            aria-label="Añadir jugador"
            className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-black/35 text-white transition hover:border-cyan-300/60 disabled:cursor-not-allowed disabled:opacity-35"
            disabled={game.players.length >= maxPlayers}
            onClick={onAddPlayer}
            title="Añadir jugador"
            type="button"
          >
            <Plus aria-hidden="true" size={16} />
          </button>
        </div>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr className="bg-black/30 text-[10px] font-black uppercase tracking-wider text-white/45">
              <th
                className="sticky left-0 z-10 min-w-[160px] px-3 py-2 text-left"
                scope="col"
                style={{ background: "var(--panel-solid-soft)" }}
              >
                Jugador
              </th>
              {FRAMES.map((n) => {
                const isActiveCol = activeFrameNumber === n;
                const isTenth = n === 10;
                return (
                  <th
                    className={[
                      "border-l border-white/10 px-1 py-2 text-center",
                      isTenth ? "min-w-[88px]" : "min-w-[62px]",
                      isActiveCol ? "bg-cyan-300/[0.10] text-cyan-100" : "",
                    ].join(" ")}
                    key={n}
                    scope="col"
                  >
                    {n}
                  </th>
                );
              })}
              <th
                className="sticky right-0 z-10 min-w-[90px] border-l border-white/10 px-3 py-2 text-right"
                scope="col"
                style={{ background: "var(--panel-solid-soft)" }}
              >
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {playerScores.map(({ player, score }, playerIdx) => {
              const isActive = playerIdx === activeIndex && !finished;
              const isWinner = winnerIds.includes(player.id);
              const handicap = game.playerHandicaps[player.id] ?? game.playerHandicaps[player.name] ?? 0;
              const total = score.total;
              const final = total + handicap;
              const stickyBg = isActive
                ? "var(--panel-active)"
                : isWinner
                  ? "var(--panel-solid-soft)"
                  : "var(--panel-solid)";

              const accent = isActive
                ? "border-l-4 border-l-cyan-300"
                : isWinner
                  ? "border-l-4 border-l-amber-300"
                  : "border-l-4 border-l-transparent";

              return (
                <tr
                  className={[
                    "border-t border-white/10 transition",
                    isActive ? "bg-cyan-300/[0.04]" : "",
                    isWinner && !isActive ? "bg-amber-200/[0.04]" : "",
                  ].join(" ")}
                  key={player.id}
                >
                  <td
                    className={`sticky left-0 z-10 min-w-[160px] py-2 pl-2 pr-3 ${accent}`}
                    style={{ background: stickyBg }}
                  >
                    <PlayerNameInput
                      isActive={isActive}
                      isLocked={lockedPlayerIds.includes(player.id)}
                      isWinner={isWinner}
                      onChange={(name) => onNameChange(player.id, name)}
                      value={player.name}
                    />
                  </td>
                  {score.frames.map((frame) => (
                    <FrameCell
                      frame={frame}
                      isActive={isActive && frame.frameNumber === score.currentFrameIndex + 1}
                      key={frame.frameNumber}
                    />
                  ))}
                  <td
                    className="sticky right-0 z-10 border-l border-white/10 px-3 py-2 text-right"
                    style={{ background: stickyBg }}
                  >
                    <div className="text-xl font-black leading-tight text-amber-200">{final}</div>
                    {handicap > 0 && (
                      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-200">
                        {total} +{handicap}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

interface PlayerNameInputProps {
  value: string;
  isActive: boolean;
  isLocked: boolean;
  isWinner: boolean;
  onChange: (next: string) => void;
}

function PlayerNameInput({ value, isActive, isLocked, isWinner, onChange }: PlayerNameInputProps) {
  return (
    <div className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className={[
          "grid h-8 w-8 shrink-0 place-items-center rounded-lg transition",
          isWinner
            ? "bg-amber-200/20 text-amber-200"
            : isActive
              ? "bg-cyan-300/25 text-cyan-100"
              : "bg-white/10 text-white/55",
        ].join(" ")}
      >
        {isWinner ? <Crown size={14} /> : <UserRound size={14} />}
      </span>
      <input
        aria-label={isLocked ? "Nombre del jugador vinculado a la cuenta" : "Nombre del jugador"}
        className={[
          "w-full min-w-0 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm font-bold text-white outline-none transition placeholder:text-white/30",
          isLocked
            ? "cursor-not-allowed text-white/70"
            : "hover:border-white/10 focus:border-cyan-300/70 focus:bg-black/25",
        ].join(" ")}
        disabled={isLocked}
        maxLength={24}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Jugador"
        title={isLocked ? "Este nombre viene de tu cuenta local" : undefined}
        value={value}
      />
    </div>
  );
}

interface FrameCellProps {
  frame: FrameScore;
  isActive: boolean;
}

function FrameCell({ frame, isActive }: FrameCellProps) {
  const slots = frame.frameNumber === 10 ? 3 : 2;
  const symbols = Array.from({ length: slots }, (_, i) => frame.symbols[i] ?? "");
  const kindStyles =
    frame.kind === "strike"
      ? "text-amber-200"
      : frame.kind === "spare"
        ? "text-cyan-200"
        : "text-white";

  return (
    <td
      aria-current={isActive ? "step" : undefined}
      className={[
        "border-l border-white/10 px-1 py-1 text-center align-top transition",
        isActive ? "bg-cyan-300/15 ring-1 ring-inset ring-cyan-300/40" : "",
      ].join(" ")}
    >
      <div className={["grid gap-px", slots === 3 ? "grid-cols-3" : "grid-cols-2"].join(" ")}>
        {symbols.map((sym, i) => (
          <span
            className={[
              "grid h-5 min-h-[20px] place-items-center text-sm font-black",
              sym ? kindStyles : "text-white/15",
            ].join(" ")}
            key={i}
          >
            {sym || "·"}
          </span>
        ))}
      </div>
      <div className="mt-1 text-xs font-black text-amber-200">
        {frame.cumulativeScore ?? <span className="text-white/25">—</span>}
      </div>
    </td>
  );
}
