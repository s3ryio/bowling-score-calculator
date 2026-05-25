import { Crown, Pencil, UserRound } from "lucide-react";

import { calculateGameScore } from "@/lib/bowling-score";
import type { PlayerGame } from "@/types/bowling";

interface PlayerCardProps {
  canEditName?: boolean;
  isActive: boolean;
  onNameChange?: (name: string) => void;
  player: PlayerGame;
  rank?: number;
}

export function PlayerCard({ canEditName = false, isActive, onNameChange, player, rank }: PlayerCardProps) {
  const score = calculateGameScore(player.rolls);
  const label = score.isComplete ? "Completa" : `Frame ${score.currentFrameIndex + 1}`;

  return (
    <article
      className={[
        "rounded-lg border p-3 transition",
        isActive
          ? "border-cyan-300/70 bg-cyan-300/[0.09] shadow-[0_0_36px_rgba(34,211,238,0.12)]"
          : "border-white/10 bg-white/[0.045]",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-black/35 text-cyan-100">
            {rank === 1 ? <Crown size={18} /> : <UserRound size={18} />}
          </span>
          <div>
            {canEditName && onNameChange ? (
              <label className="group flex items-center gap-2">
                <span className="sr-only">Nombre del jugador</span>
                <Pencil aria-hidden="true" className="text-white/35 transition group-focus-within:text-cyan-200" size={14} />
                <input
                  className="w-full min-w-0 rounded-md border border-white/10 bg-black/25 px-2 py-1 text-sm font-bold text-white outline-none transition placeholder:text-white/30 focus:border-cyan-300/70"
                  maxLength={24}
                  onChange={(event) => onNameChange(event.target.value)}
                  value={player.name}
                />
              </label>
            ) : (
              <h3 className="font-bold text-white">{player.name}</h3>
            )}
            <p className="text-sm text-white/50">{isActive ? "Turno actual" : label}</p>
          </div>
        </div>
        <span aria-label={`Puntuación de ${player.name}: ${score.total}`} className="text-2xl font-black text-amber-200">
          {score.total}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-10 gap-1">
        {score.frames.map((frame) => (
          <span
            className={[
              "h-1.5 rounded-full",
              frame.isComplete ? "bg-emerald-300" : "bg-white/15",
              isActive && frame.frameNumber === score.currentFrameIndex + 1 ? "bg-cyan-300" : "",
            ].join(" ")}
            key={frame.frameNumber}
          />
        ))}
      </div>
    </article>
  );
}
