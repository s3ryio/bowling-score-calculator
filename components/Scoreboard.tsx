"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SetStateAction } from "react";
import { BarChart3, Gamepad2, History, Keyboard, ShieldCheck, Swords } from "lucide-react";

import { AchievementsPanel } from "@/components/AchievementsPanel";
import { AuthPanel } from "@/components/AuthPanel";
import { BowlingScoreboardTable } from "@/components/BowlingScoreboardTable";
import { GameOverPanel } from "@/components/GameOverPanel";
import { GameSummary } from "@/components/GameSummary";
import { HandicapPanel } from "@/components/HandicapPanel";
import { HeadToHeadPanel } from "@/components/HeadToHeadPanel";
import { HistoryPanel } from "@/components/HistoryPanel";
import { FriendsRankingPanel } from "@/components/FriendsRankingPanel";
import { OnlineClubPanel } from "@/components/OnlineClubPanel";
import { PinPad } from "@/components/PinPad";
import { PwaRegister } from "@/components/PwaRegister";
import { RulesExplanation } from "@/components/RulesExplanation";
import { StatsPanel } from "@/components/StatsPanel";
import { ShortcutsOverlay } from "@/components/ShortcutsOverlay";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TournamentPanel } from "@/components/TournamentPanel";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useTheme } from "@/hooks/useTheme";
import {
  attachGameOwner,
  claimGuestHistory,
  getAccountHistory,
  getSessionAccount,
  loginLocalAccount,
  registerLocalAccount,
} from "@/lib/auth";
import { evaluateAchievements } from "@/lib/bowling-achievements";
import { listKnownPlayers } from "@/lib/bowling-charts";
import { calculateAutoHandicap } from "@/lib/bowling-modes";
import {
  attachTournamentOwner,
  clearFixtureResult,
  getAccountTournaments,
  recordFixtureResult,
} from "@/lib/bowling-tournament";
import {
  addRoll,
  calculateGameScore,
  calculateStats,
  removeLastRoll,
} from "@/lib/bowling-score";
import {
  clampPlayerCount,
  createGame,
  createId,
  createSavedGame,
  findNextActivePlayer,
  findPlayerToUndo,
  hasStarted,
  isGameFinished,
  rankPlayers,
  renamePlayer,
  restartGameWithPlayers,
  restoreStoredGame,
  syncPrimaryPlayerName,
} from "@/lib/bowling-game";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type {
  AuthSession,
  BowlingGame,
  HandicapConfig,
  SavedGame,
  Tournament,
  UserAccount,
} from "@/types/bowling";
import type { OnlineProfile } from "@/types/online";

const HISTORY_KEY = "bowling-score-calculator-history";
const ACTIVE_GAME_KEY = "bowling-score-calculator-active-game";
const AUTH_ACCOUNTS_KEY = "bowling-score-calculator-accounts";
const AUTH_SESSION_KEY = "bowling-score-calculator-session";
const TOURNAMENTS_KEY = "bowling-score-calculator-tournaments";
const EMPTY_HISTORY: SavedGame[] = [];
const EMPTY_ACCOUNTS: UserAccount[] = [];
const EMPTY_TOURNAMENTS: Tournament[] = [];

type ActivePanel = "game" | "history" | "stats" | "tournaments" | "account";

interface PanelEntry {
  id: ActivePanel;
  label: string;
  icon: typeof Gamepad2;
  mobileOnly?: boolean;
}

const panels: PanelEntry[] = [
  { id: "game", label: "Partida", icon: Gamepad2, mobileOnly: true },
  { id: "history", label: "Historial", icon: History },
  { id: "stats", label: "Stats", icon: BarChart3 },
  { id: "tournaments", label: "Torneo", icon: Swords },
  { id: "account", label: "Club", icon: ShieldCheck },
];

const desktopPanels = panels.filter((panel) => !panel.mobileOnly);

export function Scoreboard() {
  const initialGame = useMemo(() => createGame(1), []);
  const [history, setHistory, historyReady] = useLocalStorage<SavedGame[]>(HISTORY_KEY, EMPTY_HISTORY);
  const [storedGame, setStoredGame] = useLocalStorage<BowlingGame>(ACTIVE_GAME_KEY, initialGame);
  const [accounts, setAccounts] = useLocalStorage<UserAccount[]>(AUTH_ACCOUNTS_KEY, EMPTY_ACCOUNTS);
  const [session, setSession] = useLocalStorage<AuthSession | null>(AUTH_SESSION_KEY, null);
  const [tournaments, setTournaments] = useLocalStorage<Tournament[]>(TOURNAMENTS_KEY, EMPTY_TOURNAMENTS);
  const { preference: themePreference, resolvedTheme, setPreference: setThemePreference } = useTheme();
  const [activePanel, setActivePanel] = useState<ActivePanel>("game");
  const [moment, setMoment] = useState<{ id: number; label: string; detail: string } | null>(null);
  const [selectedGame, setSelectedGame] = useState<SavedGame | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [onlineProfile, setOnlineProfile] = useState<OnlineProfile | null>(null);

  const game = useMemo(() => restoreStoredGame(storedGame), [storedGame]);
  const currentUser = useMemo(() => getSessionAccount(accounts, session), [accounts, session]);
  const userId = currentUser?.id ?? null;
  const lockedPrimaryName = onlineProfile?.username ?? currentUser?.name ?? null;
  const accountHistory = useMemo(() => getAccountHistory(history, userId), [history, userId]);
  const guestHistoryCount = useMemo(() => getAccountHistory(history, null).length, [history]);
  const playerCount = game.players.length;
  const activePlayer = game.players[game.activePlayerIndex] ?? game.players[0];
  const activeScore = calculateGameScore(activePlayer.rolls);
  const stats = useMemo(() => calculateStats(accountHistory), [accountHistory]);
  const achievements = useMemo(() => evaluateAchievements(accountHistory), [accountHistory]);
  const accountTournaments = useMemo(
    () => getAccountTournaments(tournaments, userId),
    [tournaments, userId],
  );
  const knownPlayers = useMemo(() => listKnownPlayers(accountHistory), [accountHistory]);
  const canUndo = game.players.some((player) => player.rolls.length > 0);
  const finished = isGameFinished(game);

  const setGame = useCallback(
    (action: SetStateAction<BowlingGame>) => {
      setStoredGame((currentGame) => {
        const safeCurrentGame = restoreStoredGame(currentGame);
        const nextGame =
          typeof action === "function"
            ? (action as (previousGame: BowlingGame) => BowlingGame)(safeCurrentGame)
            : action;

        return restoreStoredGame(nextGame);
      });
    },
    [setStoredGame],
  );

  useEffect(() => {
    if (!moment) {
      return;
    }

    const timeout = window.setTimeout(() => setMoment(null), 1300);
    return () => window.clearTimeout(timeout);
  }, [moment]);

  function roll(pins: number) {
    setError(null);
    setActivePanel("game");
    setGame((currentGame) => {
      const currentPlayer = currentGame.players[currentGame.activePlayerIndex];
      const before = calculateGameScore(currentPlayer.rolls);

      try {
        const nextRolls = addRoll(currentPlayer.rolls, pins);
        const after = calculateGameScore(nextRolls);
        const players = currentGame.players.map((player, index) =>
          index === currentGame.activePlayerIndex ? { ...player, rolls: nextRolls } : player,
        );

        const shouldAdvance = after.isComplete || after.currentFrameIndex > before.currentFrameIndex;
        const activePlayerIndex = shouldAdvance
          ? findNextActivePlayer(players, currentGame.activePlayerIndex)
          : currentGame.activePlayerIndex;
        const latestFrame = [...after.frames].reverse().find((frame) => frame.rolls.length > 0);

        if (pins === 10) {
          setMoment({ id: Date.now(), label: "STRIKE", detail: currentPlayer.name });
        } else if (latestFrame?.kind === "spare" && latestFrame.isComplete) {
          setMoment({ id: Date.now(), label: "SPARE", detail: currentPlayer.name });
        }

        return {
          ...currentGame,
          players,
          activePlayerIndex,
          rollHistory: [...currentGame.rollHistory, currentGame.activePlayerIndex],
          savedAt: undefined,
        };
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Tirada no válida.");
        return currentGame;
      }
    });
  }

  function undo() {
    setError(null);
    setGame((currentGame) => {
      const playerIndex = findPlayerToUndo(currentGame);

      if (playerIndex === null) {
        return currentGame;
      }

      const players = currentGame.players.map((player, index) =>
        index === playerIndex ? { ...player, rolls: removeLastRoll(player.rolls) } : player,
      );

      return {
        ...currentGame,
        players,
        activePlayerIndex: playerIndex,
        rollHistory: currentGame.rollHistory.slice(0, -1),
        savedAt: undefined,
      };
    });
  }

  const recomputeHandicaps = useCallback(
    (target: BowlingGame): BowlingGame => {
      if (!target.handicap.enabled) {
        return { ...target, playerHandicaps: {} };
      }
      const playerHandicaps: Record<string, number> = {};
      for (const player of target.players) {
        playerHandicaps[player.id] = calculateAutoHandicap(player.name, accountHistory, target.handicap);
      }
      return { ...target, playerHandicaps };
    },
    [accountHistory],
  );

  useEffect(() => {
    if (!lockedPrimaryName) {
      return;
    }

    setGame((currentGame) => recomputeHandicaps(syncPrimaryPlayerName(currentGame, lockedPrimaryName)));
  }, [lockedPrimaryName, recomputeHandicaps, setGame]);

  function changePlayerName(playerId: string, name: string) {
    if (lockedPrimaryName && game.players[0]?.id === playerId) {
      return;
    }
    setGame((currentGame) => recomputeHandicaps(renamePlayer(currentGame, playerId, name)));
  }

  function reset(nextPlayerCount = playerCount) {
    if (hasStarted(game) && !window.confirm("¿Reiniciar la partida actual?")) {
      return;
    }

    const count = clampPlayerCount(nextPlayerCount);
    setError(null);
    setSelectedGame(null);
    setGame((currentGame) => {
      const playerCountChanged = count !== currentGame.players.length;
      let next: BowlingGame;
      if (playerCountChanged) {
        next = createGame(count, {
          handicap: currentGame.handicap,
        });
        // Mantener los nombres del jugador anterior cuando es posible
        next = {
          ...next,
          players: next.players.map((p, i) => ({
            ...p,
            name: currentGame.players[i]?.name ?? p.name,
          })),
        };
      } else {
        next = restartGameWithPlayers(currentGame);
      }
      return recomputeHandicaps(next);
    });
  }

  function updateHandicap(nextHandicap: HandicapConfig) {
    setGame((currentGame) =>
      recomputeHandicaps({
        ...currentGame,
        handicap: nextHandicap,
      }),
    );
  }

  function startNewGame() {
    setError(null);
    setSelectedGame(null);
    setActivePanel("game");
    setGame((currentGame) => recomputeHandicaps(restartGameWithPlayers(currentGame)));
  }

  function updatePlayerCount(nextCount: number) {
    const count = clampPlayerCount(nextCount);

    if (count === playerCount) {
      return;
    }

    reset(count);
  }

  function saveGame() {
    if (!finished) {
      setError("Solo puedes guardar una partida completa.");
      return;
    }

    if (game.savedAt) {
      return;
    }

    const savedGame = attachGameOwner(createSavedGame(game), userId);
    setHistory((currentHistory) => [savedGame, ...currentHistory].slice(0, 50));
    setGame((currentGame) => ({ ...currentGame, savedAt: savedGame.date }));
    setSelectedGame(savedGame);
  }

  function clearHistory() {
    if (accountHistory.length === 0) {
      return;
    }

    if (!window.confirm("¿Borrar el historial de la cuenta actual?")) {
      return;
    }

    setHistory((currentHistory) =>
      currentHistory.filter((savedGame) => (userId ? savedGame.ownerId !== userId : Boolean(savedGame.ownerId))),
    );
    setSelectedGame(null);
  }

  function register(name: string, email: string, password: string) {
    const result = registerLocalAccount(accounts, {
      id: createId("user"),
      name,
      email,
      password,
      now: new Date().toISOString(),
    });

    setAccounts(result.accounts);
    setSession(result.session);
    setSelectedGame(null);
    setActivePanel("account");
  }

  function login(email: string, password: string) {
    const result = loginLocalAccount(accounts, {
      email,
      password,
      now: new Date().toISOString(),
    });

    setAccounts(result.accounts);
    setSession(result.session);
    setSelectedGame(null);
    setActivePanel("account");
  }

  function logout() {
    setSession(null);
    setSelectedGame(null);
    setActivePanel("account");
  }

  function importGuestHistory() {
    if (!currentUser) {
      return;
    }

    setHistory((currentHistory) => claimGuestHistory(currentHistory, currentUser.id));
    setSelectedGame(null);
  }

  function createTournamentEntry(tournament: Tournament) {
    const owned = attachTournamentOwner(tournament, userId);
    setTournaments((current) => [owned, ...current].slice(0, 30));
  }

  function recordTournamentResult(tournamentId: string, fixtureId: string, scoreA: number, scoreB: number) {
    try {
      setTournaments((current) =>
        current.map((tournament) =>
          tournament.id === tournamentId
            ? recordFixtureResult(tournament, fixtureId, scoreA, scoreB)
            : tournament,
        ),
      );
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Resultado de torneo no válido.");
      setActivePanel("tournaments");
    }
  }

  function clearTournamentResult(tournamentId: string, fixtureId: string) {
    setTournaments((current) =>
      current.map((tournament) =>
        tournament.id === tournamentId ? clearFixtureResult(tournament, fixtureId) : tournament,
      ),
    );
  }

  function deleteTournament(tournamentId: string) {
    setTournaments((current) => current.filter((tournament) => tournament.id !== tournamentId));
  }

  function addPlayer() {
    updatePlayerCount(playerCount + 1);
  }

  function removePlayer() {
    updatePlayerCount(playerCount - 1);
  }

  // Play area: en móvil, solo visible cuando la pestaña activa es "game".
  // En desktop, siempre visible arriba.
  function playAreaClass(): string {
    return activePanel === "game" ? "space-y-4" : "hidden lg:block lg:space-y-4";
  }

  // Tab content: visible solo cuando coincide con la pestaña activa (en móvil y desktop).
  function tabContentClass(panel: ActivePanel, extra = ""): string {
    return activePanel === panel ? `block ${extra}` : "hidden";
  }

  const shortcutEnabled = activePanel === "game" && !finished && !shortcutsOpen;
  const allowedRolls = useMemo(() => new Set(activeScore.nextRollOptions), [activeScore.nextRollOptions]);
  const currentFrame = activeScore.frames[activeScore.currentFrameIndex];
  const canShortcutSpare = !finished && (currentFrame?.rolls.length ?? 0) > 0;

  useKeyboardShortcuts({
    enabled: activePanel === "game",
    onRoll: (pins) => {
      if (!shortcutEnabled) {
        return;
      }
      if (!allowedRolls.has(pins)) {
        return;
      }
      roll(pins);
    },
    onStrike: () => {
      if (!shortcutEnabled || !allowedRolls.has(10)) {
        return;
      }
      roll(10);
    },
    onSpare: () => {
      if (!shortcutEnabled || !canShortcutSpare) {
        return;
      }
      const maxOption = activeScore.nextRollOptions.reduce(
        (max, value) => (value > max ? value : max),
        -1,
      );
      if (maxOption >= 0) {
        roll(maxOption);
      }
    },
    onUndo: () => {
      if (shortcutsOpen) {
        return;
      }
      if (canUndo) {
        undo();
      }
    },
    onReset: () => {
      if (shortcutsOpen) {
        return;
      }
      reset();
    },
    onToggleHelp: () => setShortcutsOpen((open) => !open),
  });

  return (
    <>
      <PwaRegister />
      {moment && (
        <div
          aria-live="polite"
          className="moment-toast pointer-events-none fixed inset-x-4 top-4 z-50 mx-auto max-w-sm rounded-lg border px-5 py-4 text-center backdrop-blur-xl"
          key={moment.id}
          role="status"
          style={{
            background: "var(--toast-bg)",
            borderColor: "var(--toast-border)",
            boxShadow: "var(--toast-shadow)",
          }}
        >
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/45">{moment.detail}</p>
          <p className="text-4xl font-black text-amber-200">{moment.label}</p>
        </div>
      )}

      <a className="skip-link" href="#main-content">
        Saltar al contenido principal
      </a>
      <ShortcutsOverlay onClose={() => setShortcutsOpen(false)} open={shortcutsOpen} />

      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-8">
        <div className="flex items-center justify-end gap-2">
          <button
            aria-label="Mostrar atajos de teclado"
            className="hidden h-9 items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 text-xs font-bold text-white/70 transition hover:border-cyan-300/60 hover:text-white lg:inline-flex"
            onClick={() => setShortcutsOpen(true)}
            title="Atajos de teclado (?)"
            type="button"
          >
            <Keyboard size={14} />
            Atajos
            <kbd className="rounded border border-white/15 bg-white/10 px-1.5 py-0.5 text-[10px] font-black">?</kbd>
          </button>
          <ThemeToggle
            onChange={setThemePreference}
            preference={themePreference}
            resolvedTheme={resolvedTheme}
          />
        </div>
        <main className="space-y-6" id="main-content">
          {/* Play area — siempre visible en desktop, solo en móvil si la pestaña activa es "game" */}
          <div className={playAreaClass()}>
            <GameSummary bestScore={stats.bestScore} game={game} onSave={saveGame} />

            <BowlingScoreboardTable
              finished={finished}
              game={game}
              lockedPlayerIds={lockedPrimaryName && game.players[0] ? [game.players[0].id] : []}
              onAddPlayer={addPlayer}
              onNameChange={changePlayerName}
              onRemovePlayer={removePlayer}
              winnerIds={
                finished
                  ? (() => {
                      const ranked = rankPlayers(game.players, game.mode, game.playerHandicaps);
                      const top = ranked[0];
                      if (!top) return [];
                      const topScore = top.adjustedScore ?? top.score;
                      return ranked
                        .filter((player) => (player.adjustedScore ?? player.score) === topScore)
                        .map((player) => player.id);
                    })()
                  : []
              }
            />

            {finished && <GameOverPanel game={game} onNewGame={startNewGame} onSave={saveGame} />}

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
              <PinPad
                canUndo={canUndo}
                className="sticky bottom-20 z-30 lg:static"
                disabled={finished}
                error={error}
                onReset={() => reset()}
                onRoll={roll}
                onUndo={undo}
                options={activeScore.nextRollOptions}
              />

              <div className="space-y-4">
                <HandicapPanel game={game} onChange={updateHandicap} />
              </div>
            </div>
          </div>

          {/* Tab bar — solo visible en desktop, justo encima del contenido de las pestañas */}
          <nav
            aria-label="Secciones secundarias"
            className="hidden lg:flex lg:flex-wrap lg:items-center lg:gap-1 lg:rounded-lg lg:border lg:border-white/10 lg:bg-white/[0.045] lg:p-1"
            role="tablist"
          >
            {desktopPanels.map((panel) => {
              const Icon = panel.icon;
              const isActive = activePanel === panel.id;
              return (
                <button
                  aria-controls={`tab-${panel.id}`}
                  aria-selected={isActive}
                  className={[
                    "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-bold transition",
                    isActive
                      ? "bg-cyan-300 text-black"
                      : "text-white/60 hover:bg-white/10 hover:text-white",
                  ].join(" ")}
                  key={panel.id}
                  onClick={() => setActivePanel(panel.id)}
                  role="tab"
                  type="button"
                >
                  <Icon aria-hidden="true" size={16} />
                  {panel.label}
                </button>
              );
            })}
          </nav>

          {/* Tab content — full width */}
          <div className={tabContentClass("history")} id="tab-history" role="tabpanel">
            <HistoryPanel
              history={accountHistory}
              isReady={historyReady}
              onClear={clearHistory}
              onSelect={setSelectedGame}
              selectedGame={selectedGame}
            />
          </div>

          <div className={tabContentClass("stats", "space-y-4")} id="tab-stats" role="tabpanel">
            <div className="grid gap-4 xl:grid-cols-2">
              <StatsPanel history={accountHistory} stats={stats} />
              <div className="space-y-4">
                <FriendsRankingPanel history={accountHistory} />
                <AchievementsPanel achievements={achievements} />
                <HeadToHeadPanel history={accountHistory} />
              </div>
            </div>
            <RulesExplanation />
          </div>

          <div className={tabContentClass("tournaments")} id="tab-tournaments" role="tabpanel">
            <TournamentPanel
              defaultPlayers={game.players.map((player) => player.name)}
              knownPlayers={knownPlayers}
              onClear={clearTournamentResult}
              onCreate={createTournamentEntry}
              onDelete={deleteTournament}
              onRecord={recordTournamentResult}
              tournaments={accountTournaments}
            />
          </div>

          <div className={tabContentClass("account")} id="tab-account" role="tabpanel">
            <div className="grid gap-4 xl:grid-cols-2">
              <OnlineClubPanel history={accountHistory} onProfileChange={setOnlineProfile} />
              <AuthPanel
                accountHistoryCount={accountHistory.length}
                accountsCount={accounts.length}
                currentUser={currentUser}
                guestHistoryCount={guestHistoryCount}
                onClaimGuestHistory={importGuestHistory}
                onLogin={login}
                onLogout={logout}
                onRegister={register}
              />
            </div>
          </div>
        </main>

        {/* Bottom nav — solo móvil. Incluye Partida (que en desktop está siempre arriba). */}
        <nav
          aria-label="Secciones de la app"
          className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-5 gap-1 rounded-lg border border-white/10 bg-slate-950/90 p-1 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl lg:hidden"
          role="tablist"
        >
          {panels.map((panel) => {
            const Icon = panel.icon;
            const isActive = activePanel === panel.id;

            return (
              <button
                aria-controls="main-content"
                aria-current={isActive ? "page" : undefined}
                aria-selected={isActive}
                className={[
                  "flex h-14 flex-col items-center justify-center gap-1 rounded-md text-xs font-bold transition",
                  isActive ? "bg-cyan-300 text-black" : "text-white/55 hover:bg-white/10 hover:text-white",
                ].join(" ")}
                key={panel.id}
                onClick={() => setActivePanel(panel.id)}
                role="tab"
                type="button"
              >
                <Icon aria-hidden="true" size={18} />
                {panel.label}
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
}
