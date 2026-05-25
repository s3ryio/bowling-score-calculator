"use client";

import { useMemo, useState } from "react";
import { Crown, Plus, Swords, Trash2, X } from "lucide-react";

import {
  TOURNAMENT_LIMITS,
  clampTournamentPlayers,
  computeStandings,
  createTournament,
  getTournamentChampion,
  isTournamentComplete,
} from "@/lib/bowling-tournament";
import type { Tournament } from "@/types/bowling";

interface TournamentPanelProps {
  tournaments: Tournament[];
  knownPlayers: string[];
  defaultPlayers: string[];
  onCreate: (tournament: Tournament) => void;
  onRecord: (tournamentId: string, fixtureId: string, scoreA: number, scoreB: number) => void;
  onClear: (tournamentId: string, fixtureId: string) => void;
  onDelete: (tournamentId: string) => void;
}

function formatDate(value: string): string {
  try {
    return new Intl.DateTimeFormat("es-ES", { dateStyle: "medium" }).format(new Date(value));
  } catch {
    return value;
  }
}

export function TournamentPanel({
  tournaments,
  knownPlayers,
  defaultPlayers,
  onCreate,
  onRecord,
  onClear,
  onDelete,
}: TournamentPanelProps) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [playerSlots, setPlayerSlots] = useState<string[]>(() => {
    const seed = [...defaultPlayers];
    while (seed.length < TOURNAMENT_LIMITS.minPlayers + 1) {
      seed.push("");
    }
    return seed.slice(0, TOURNAMENT_LIMITS.maxPlayers);
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [resultDrafts, setResultDrafts] = useState<Record<string, { a: string; b: string }>>({});

  const activeTournament = useMemo(
    () => tournaments.find((tournament) => tournament.id === activeId) ?? null,
    [tournaments, activeId],
  );

  const playerSuggestions = useMemo(() => knownPlayers.slice(0, 12), [knownPlayers]);

  function updatePlayerSlot(index: number, value: string) {
    setPlayerSlots((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
  }

  function addPlayerSlot() {
    setPlayerSlots((current) =>
      current.length >= TOURNAMENT_LIMITS.maxPlayers ? current : [...current, ""],
    );
  }

  function removePlayerSlot(index: number) {
    setPlayerSlots((current) => current.filter((_, i) => i !== index));
  }

  function resetCreateForm() {
    setCreating(false);
    setName("");
    setCreateError(null);
    setPlayerSlots(() => {
      const seed = [...defaultPlayers];
      while (seed.length < TOURNAMENT_LIMITS.minPlayers + 1) {
        seed.push("");
      }
      return seed.slice(0, TOURNAMENT_LIMITS.maxPlayers);
    });
  }

  function handleCreate() {
    setCreateError(null);
    try {
      const cleaned = clampTournamentPlayers(playerSlots);
      if (cleaned.length < TOURNAMENT_LIMITS.minPlayers) {
        setCreateError("Necesitas al menos 2 jugadores distintos.");
        return;
      }
      const tournament = createTournament(name, cleaned);
      onCreate(tournament);
      setActiveId(tournament.id);
      resetCreateForm();
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "No se pudo crear el torneo.");
    }
  }

  function handleRecord(fixtureId: string) {
    if (!activeTournament) {
      return;
    }
    const draft = resultDrafts[fixtureId];
    if (!draft) {
      return;
    }
    const a = Number.parseInt(draft.a, 10);
    const b = Number.parseInt(draft.b, 10);
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      return;
    }
    if (a < 0 || b < 0 || a > 450 || b > 450) {
      setCreateError("Las puntuaciones del torneo deben estar entre 0 y 450.");
      return;
    }
    try {
      onRecord(activeTournament.id, fixtureId, a, b);
      setCreateError(null);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Resultado no válido.");
      return;
    }
    setResultDrafts((current) => {
      const next = { ...current };
      delete next[fixtureId];
      return next;
    });
  }

  function handleDelete(tournamentId: string) {
    if (!window.confirm("¿Borrar este torneo? No se puede deshacer.")) {
      return;
    }
    onDelete(tournamentId);
    if (activeId === tournamentId) {
      setActiveId(null);
    }
  }

  function renderTournamentDetail(tournament: Tournament) {
    const standings = computeStandings(tournament);
    const champion = getTournamentChampion(tournament);
    const complete = isTournamentComplete(tournament);
    const fixturesPending = tournament.fixtures.filter((fixture) => fixture.scoreA == null).length;

    return (
      <article className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-white">{tournament.name}</h3>
            <p className="text-sm text-white/45">
              {formatDate(tournament.createdAt)} · {tournament.players.length} jugadores · {tournament.fixtures.length} partidas
            </p>
            <p className="mt-1 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-200">
              <span className="rounded border border-cyan-300/30 bg-cyan-300/10 px-2 py-0.5">
                Oficial
              </span>
              {complete ? (
                <span className="rounded border border-amber-200/40 bg-amber-200/10 px-2 py-0.5 text-amber-100">
                  Completo
                </span>
              ) : (
                <span className="rounded border border-white/15 bg-white/5 px-2 py-0.5 text-white/55">
                  {fixturesPending} pendientes
                </span>
              )}
            </p>
          </div>
          <button
            aria-label="Borrar torneo"
            className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-black/35 text-white transition hover:border-rose-300/60 hover:text-rose-200"
            onClick={() => handleDelete(tournament.id)}
            title="Borrar torneo"
            type="button"
          >
            <Trash2 aria-hidden="true" size={16} />
          </button>
        </div>

        {champion && (
          <div className="rounded-lg border border-amber-200/30 bg-amber-200/10 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-100">Campeón</p>
            <p className="mt-1 flex items-center gap-2 text-lg font-black text-white">
              <Crown aria-hidden="true" className="text-amber-200" size={18} />
              {champion}
            </p>
          </div>
        )}

        <div className="overflow-hidden rounded-lg border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-black/30 text-[10px] uppercase tracking-wider text-white/45">
              <tr>
                <th className="px-2 py-2 text-left">#</th>
                <th className="px-2 py-2 text-left">Jugador</th>
                <th className="px-2 py-2 text-center" title="Jugadas">PJ</th>
                <th className="px-2 py-2 text-center" title="Victorias">V</th>
                <th className="px-2 py-2 text-center" title="Empates">E</th>
                <th className="px-2 py-2 text-center" title="Derrotas">D</th>
                <th className="px-2 py-2 text-center" title="Diferencia de pinos">+/-</th>
                <th className="px-2 py-2 text-right">Media</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((standing, index) => (
                <tr
                  className={`border-t border-white/5 ${index === 0 && complete ? "bg-amber-200/[0.05]" : ""}`}
                  key={standing.player}
                >
                  <td className="px-2 py-2 text-white/45">{index + 1}</td>
                  <td className="px-2 py-2 font-bold text-white">{standing.player}</td>
                  <td className="px-2 py-2 text-center text-white/70">{standing.played}</td>
                  <td className="px-2 py-2 text-center font-bold text-emerald-200">{standing.wins}</td>
                  <td className="px-2 py-2 text-center text-white/70">{standing.draws}</td>
                  <td className="px-2 py-2 text-center text-rose-200">{standing.losses}</td>
                  <td
                    className={`px-2 py-2 text-center font-bold ${standing.scoreDiff > 0 ? "text-cyan-200" : standing.scoreDiff < 0 ? "text-rose-200" : "text-white/45"}`}
                  >
                    {standing.scoreDiff > 0 ? "+" : ""}
                    {standing.scoreDiff}
                  </td>
                  <td className="px-2 py-2 text-right font-bold text-amber-200">{standing.averageScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-white/45">Fixtures</p>
          {tournament.fixtures.map((fixture) => {
            const recorded = fixture.scoreA != null && fixture.scoreB != null;
            const draft = resultDrafts[fixture.id] ?? { a: "", b: "" };

            return (
              <div
                className={[
                  "rounded-lg border p-3",
                  recorded ? "border-emerald-300/20 bg-emerald-300/[0.05]" : "border-white/10 bg-black/25",
                ].join(" ")}
                key={fixture.id}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 text-sm font-bold text-white">
                    {fixture.playerA} <span className="text-white/35">vs</span> {fixture.playerB}
                  </div>
                  {recorded ? (
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-black/30 px-2 py-1 font-black text-cyan-100">
                        {fixture.scoreA}
                      </span>
                      <span className="text-white/35">–</span>
                      <span className="rounded bg-black/30 px-2 py-1 font-black text-amber-200">
                        {fixture.scoreB}
                      </span>
                      <button
                        aria-label="Editar resultado"
                        className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-black/35 text-white/60 transition hover:border-white/30 hover:text-white"
                        onClick={() => onClear(tournament.id, fixture.id)}
                        title="Reabrir resultado"
                        type="button"
                      >
                        <X aria-hidden="true" size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        aria-label={`Puntuación de ${fixture.playerA}`}
                        className="h-9 w-16 rounded-md border border-white/10 bg-black/35 px-2 text-sm font-bold text-white outline-none transition focus:border-cyan-300/70"
                        max={450}
                        min={0}
                        onChange={(event) =>
                          setResultDrafts((current) => ({
                            ...current,
                            [fixture.id]: { ...draft, a: event.target.value },
                          }))
                        }
                        placeholder="0"
                        type="number"
                        value={draft.a}
                      />
                      <span className="text-white/35">–</span>
                      <input
                        aria-label={`Puntuación de ${fixture.playerB}`}
                        className="h-9 w-16 rounded-md border border-white/10 bg-black/35 px-2 text-sm font-bold text-white outline-none transition focus:border-cyan-300/70"
                        max={450}
                        min={0}
                        onChange={(event) =>
                          setResultDrafts((current) => ({
                            ...current,
                            [fixture.id]: { ...draft, b: event.target.value },
                          }))
                        }
                        placeholder="0"
                        type="number"
                        value={draft.b}
                      />
                      <button
                        className="h-9 rounded-lg border border-emerald-300/35 bg-emerald-300 px-3 text-xs font-black text-black transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-35"
                        disabled={draft.a === "" || draft.b === ""}
                        onClick={() => handleRecord(fixture.id)}
                        type="button"
                      >
                        Guardar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </article>
    );
  }

  return (
    <section
      aria-label="Torneos locales"
      className="rounded-lg border border-white/10 bg-white/[0.045] p-4"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-white">
            <Swords aria-hidden="true" className="text-cyan-200" size={18} />
            <h2 className="text-lg font-black">Torneos</h2>
          </div>
          <p className="text-sm text-white/45">
            Todos contra todos. Introduce los resultados a mano cuando termines cada partida.
          </p>
        </div>
        {!creating && (
          <button
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-3 text-sm font-black text-cyan-100 transition hover:border-cyan-200/70 hover:bg-cyan-300/15"
            onClick={() => setCreating(true)}
            type="button"
          >
            <Plus aria-hidden="true" size={14} />
            Nuevo torneo
          </button>
        )}
      </div>

      {createError && (
        <p className="mb-4 rounded-lg border border-rose-300/25 bg-rose-300/10 p-2 text-sm text-rose-100">
          {createError}
        </p>
      )}

      {creating && (
        <div className="mb-4 space-y-3 rounded-lg border border-cyan-300/25 bg-cyan-300/[0.06] p-3">
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-white/40">
              Nombre
            </span>
            <input
              className="h-10 w-full rounded-lg border border-white/10 bg-black/35 px-3 text-sm font-bold text-white outline-none transition focus:border-cyan-300/70"
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej: Torneo Viernes Noche"
              value={name}
            />
          </label>

          <div>
            <span className="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-white/40">
              Jugadores ({clampTournamentPlayers(playerSlots).length})
            </span>
            <div className="space-y-2">
              {playerSlots.map((slot, index) => (
                <div className="flex items-center gap-2" key={index}>
                  <input
                    aria-label={`Nombre del jugador ${index + 1}`}
                    className="h-9 flex-1 rounded-md border border-white/10 bg-black/35 px-3 text-sm font-bold text-white outline-none transition focus:border-cyan-300/70"
                    list="tournament-players"
                    onChange={(event) => updatePlayerSlot(index, event.target.value)}
                    placeholder={`Jugador ${index + 1}`}
                    value={slot}
                  />
                  {playerSlots.length > TOURNAMENT_LIMITS.minPlayers && (
                    <button
                      aria-label={`Quitar jugador ${index + 1}`}
                      className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-black/35 text-white/60 transition hover:border-rose-300/60 hover:text-rose-200"
                      onClick={() => removePlayerSlot(index)}
                      title="Quitar"
                      type="button"
                    >
                      <X aria-hidden="true" size={14} />
                    </button>
                  )}
                </div>
              ))}
              <datalist id="tournament-players">
                {playerSuggestions.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
              {playerSlots.length < TOURNAMENT_LIMITS.maxPlayers && (
                <button
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 text-xs font-bold text-white/70 transition hover:border-cyan-300/40 hover:text-white"
                  onClick={addPlayerSlot}
                  type="button"
                >
                  <Plus aria-hidden="true" size={14} />
                  Añadir jugador
                </button>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              className="h-10 rounded-lg border border-white/10 bg-black/30 px-3 text-sm font-bold text-white transition hover:border-white/30"
              onClick={resetCreateForm}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="h-10 rounded-lg bg-cyan-300 px-4 text-sm font-black text-black transition hover:bg-cyan-200"
              onClick={handleCreate}
              type="button"
            >
              Crear torneo
            </button>
          </div>
        </div>
      )}

      {tournaments.length === 0 && !creating ? (
        <div className="rounded-lg border border-dashed border-white/15 p-4 text-sm text-white/45">
          Aún no hay torneos. Pulsa “Nuevo torneo” para empezar.
        </div>
      ) : (
        <div className="space-y-2">
          {!activeTournament &&
            tournaments.map((tournament) => {
              const champion = getTournamentChampion(tournament);
              const complete = isTournamentComplete(tournament);
              const pending = tournament.fixtures.filter((fixture) => fixture.scoreA == null).length;
              return (
                <button
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/25 p-3 text-left transition hover:border-cyan-300/40 hover:bg-cyan-300/[0.05]"
                  key={tournament.id}
                  onClick={() => setActiveId(tournament.id)}
                  type="button"
                >
                  <div>
                    <p className="font-black text-white">{tournament.name}</p>
                    <p className="mt-0.5 text-xs text-white/45">
                      {formatDate(tournament.createdAt)} · {tournament.players.length} jugadores ·{" "}
                      {complete ? `Campeón: ${champion}` : `${pending} partidas pendientes`}
                    </p>
                  </div>
                  <span
                    className={[
                      "rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-wider",
                      complete
                        ? "border-amber-200/40 bg-amber-200/10 text-amber-100"
                        : "border-cyan-300/30 bg-cyan-300/10 text-cyan-100",
                    ].join(" ")}
                  >
                    {complete ? "Completo" : "En curso"}
                  </span>
                </button>
              );
            })}

          {activeTournament && (
            <div className="space-y-3">
              <button
                className="inline-flex h-8 items-center gap-2 rounded-lg border border-white/10 bg-black/25 px-3 text-xs font-bold text-white/70 transition hover:border-white/30 hover:text-white"
                onClick={() => setActiveId(null)}
                type="button"
              >
                ← Volver a la lista
              </button>
              {renderTournamentDetail(activeTournament)}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
