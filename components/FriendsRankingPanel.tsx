"use client";

import { Medal, Trophy, UsersRound } from "lucide-react";

import { getFriendsRanking } from "@/lib/bowling-analytics";
import type { SavedGame } from "@/types/bowling";

interface FriendsRankingPanelProps {
  history: SavedGame[];
}

export function FriendsRankingPanel({ history }: FriendsRankingPanelProps) {
  const ranking = getFriendsRanking(history, 8);

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-white">
            <Trophy aria-hidden="true" className="text-amber-200" size={18} />
            <h2 className="text-lg font-black">Ranking de amigos</h2>
          </div>
          <p className="text-sm text-white/45">Clasificación local por mejor puntuación guardada.</p>
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 text-cyan-100">
          <UsersRound aria-hidden="true" size={18} />
        </span>
      </div>

      {ranking.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/15 p-4 text-sm text-white/45">
          Guarda partidas con tus amigos para crear el ranking.
        </div>
      ) : (
        <div className="space-y-2">
          {ranking.map((player) => (
            <article
              className={[
                "flex items-center justify-between gap-3 rounded-lg border p-3",
                player.rank === 1
                  ? "border-amber-200/35 bg-amber-200/[0.08]"
                  : "border-white/10 bg-black/25",
              ].join(" ")}
              key={player.name}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={[
                    "grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sm font-black",
                    player.rank === 1 ? "bg-amber-200 text-black" : "bg-white/10 text-white/65",
                  ].join(" ")}
                >
                  {player.rank === 1 ? <Medal aria-hidden="true" size={16} /> : player.rank}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-black text-white">{player.name}</p>
                  <p className="text-xs text-white/45">
                    {player.gamesPlayed} partidas · media {player.averageScore}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-amber-200">{player.bestScore}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">mejor</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
