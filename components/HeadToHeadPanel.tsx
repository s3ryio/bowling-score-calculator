"use client";

import { useMemo, useState } from "react";
import { Swords, Trophy } from "lucide-react";

import { headToHead, listKnownPlayers } from "@/lib/bowling-charts";
import type { SavedGame } from "@/types/bowling";

interface HeadToHeadPanelProps {
  history: SavedGame[];
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }
  try {
    return new Intl.DateTimeFormat("es-ES", { dateStyle: "medium" }).format(new Date(value));
  } catch {
    return "—";
  }
}

export function HeadToHeadPanel({ history }: HeadToHeadPanelProps) {
  const players = useMemo(() => listKnownPlayers(history), [history]);
  // Selección manual del usuario. Si no la hay, derivamos los dos primeros jugadores conocidos.
  const [selectedA, setSelectedA] = useState<string | null>(null);
  const [selectedB, setSelectedB] = useState<string | null>(null);

  const playerA = selectedA && players.includes(selectedA) ? selectedA : players[0] ?? "";
  const playerB =
    selectedB && players.includes(selectedB) && selectedB !== playerA
      ? selectedB
      : players.find((name) => name !== playerA) ?? "";

  const result = useMemo(() => headToHead(history, playerA, playerB), [history, playerA, playerB]);
  const totalWins = result.winsA + result.winsB;
  const sliderA = totalWins === 0 ? 50 : Math.round((result.winsA / totalWins) * 100);

  if (players.length < 2) {
    return (
      <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
        <div className="mb-2 flex items-center gap-2 text-white">
          <Swords aria-hidden="true" className="text-cyan-200" size={18} />
          <h2 className="text-lg font-black">Cara a cara</h2>
        </div>
        <p className="text-sm text-white/45">
          Necesitas al menos dos jugadores distintos en el historial para comparar.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Comparativa cara a cara" className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-white">
            <Swords aria-hidden="true" className="text-cyan-200" size={18} />
            <h2 className="text-lg font-black">Cara a cara</h2>
          </div>
          <p className="text-sm text-white/45">Compara a dos jugadores en partidas conjuntas.</p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-white/40">
            Jugador A
          </span>
          <select
            aria-label="Jugador A"
            className="h-10 w-full rounded-lg border border-white/10 bg-black/35 px-2 text-sm font-bold text-white outline-none transition focus:border-cyan-300/70"
            onChange={(event) => setSelectedA(event.target.value)}
            value={playerA}
          >
            {players.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-white/40">
            Jugador B
          </span>
          <select
            aria-label="Jugador B"
            className="h-10 w-full rounded-lg border border-white/10 bg-black/35 px-2 text-sm font-bold text-white outline-none transition focus:border-cyan-300/70"
            onChange={(event) => setSelectedB(event.target.value)}
            value={playerB}
          >
            {players.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {result.meetings === 0 ? (
        <div className="rounded-lg border border-dashed border-white/15 p-4 text-sm text-white/45">
          {playerA && playerB && playerA !== playerB
            ? `Aún no hay partidas guardadas con ${playerA} y ${playerB} juntos.`
            : "Selecciona dos jugadores distintos."}
        </div>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/30 p-3">
            <div className="text-left">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-200">{result.playerA}</p>
              <p className="text-3xl font-black text-white">{result.winsA}</p>
              <p className="text-[10px] uppercase tracking-wider text-white/40">Victorias</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/40">Empates</p>
              <p className="text-2xl font-black text-white/70">{result.ties}</p>
              <p className="text-[10px] uppercase tracking-wider text-white/40">{result.meetings} partidas</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-200">{result.playerB}</p>
              <p className="text-3xl font-black text-white">{result.winsB}</p>
              <p className="text-[10px] uppercase tracking-wider text-white/40">Victorias</p>
            </div>
          </div>

          <div
            aria-label={`${result.playerA} ha ganado ${sliderA} por ciento de las partidas no empatadas`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={sliderA}
            className="mb-4 h-2 w-full overflow-hidden rounded-full bg-amber-300/30"
            role="progressbar"
          >
            <div
              className="h-full rounded-full bg-cyan-400"
              style={{ width: `${sliderA}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-md border border-white/10 bg-black/25 p-2">
              <p className="text-[10px] uppercase tracking-wider text-white/40">Mejor {result.playerA}</p>
              <p className="text-lg font-black text-amber-200">{result.bestA}</p>
            </div>
            <div className="rounded-md border border-white/10 bg-black/25 p-2">
              <p className="text-[10px] uppercase tracking-wider text-white/40">Mejor {result.playerB}</p>
              <p className="text-lg font-black text-amber-200">{result.bestB}</p>
            </div>
            <div className="rounded-md border border-white/10 bg-black/25 p-2">
              <p className="text-[10px] uppercase tracking-wider text-white/40">Media {result.playerA}</p>
              <p className="text-lg font-black text-cyan-200">{result.averageA}</p>
            </div>
            <div className="rounded-md border border-white/10 bg-black/25 p-2">
              <p className="text-[10px] uppercase tracking-wider text-white/40">Media {result.playerB}</p>
              <p className="text-lg font-black text-cyan-200">{result.averageB}</p>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs text-white/45">
            <Trophy aria-hidden="true" className="text-amber-200" size={14} />
            Último enfrentamiento: <span className="font-bold text-white/70">{formatDate(result.lastMeetingDate)}</span>
          </div>
        </>
      )}
    </section>
  );
}
