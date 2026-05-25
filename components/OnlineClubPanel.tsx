"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Clipboard, LogIn, RefreshCw, ShieldCheck, Trophy, UsersRound, Wifi } from "lucide-react";
import type { User } from "@supabase/supabase-js";

import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/online/supabase-client";
import {
  acceptOnlineInvite,
  createFriendGroup,
  createOnlineInvite,
  createOnlineSeason,
  getCurrentOnlineUser,
  loadOnlineDashboard,
  signInOnline,
  signOutOnline,
  signUpOnline,
  syncSavedGamesToSupabase,
} from "@/lib/online/supabase-service";
import { getActiveSeasons } from "@/lib/online/online-utils";
import type { SavedGame } from "@/types/bowling";
import type { OnlineDashboard, OnlineProfile } from "@/types/online";

interface OnlineClubPanelProps {
  history: SavedGame[];
  onProfileChange: (profile: OnlineProfile | null) => void;
}

type AuthMode = "login" | "register";

function todayInputValue(offsetDays = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function toIsoDate(value: string, endOfDay = false): string {
  return `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`;
}

export function OnlineClubPanel({ history, onProfileChange }: OnlineClubPanelProps) {
  const configured = isSupabaseConfigured();
  const client = useMemo(() => getSupabaseBrowserClient(), []);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [user, setUser] = useState<User | null>(null);
  const [dashboard, setDashboard] = useState<OnlineDashboard | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [groupName, setGroupName] = useState("Mi liga");
  const [inviteCode, setInviteCode] = useState("");
  const [seasonName, setSeasonName] = useState("Temporada actual");
  const [seasonStart, setSeasonStart] = useState(todayInputValue());
  const [seasonEnd, setSeasonEnd] = useState(todayInputValue(30));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const profile = dashboard?.profile ?? null;
  const activeGroup = dashboard?.groups[0] ?? null;
  const activeSeason = useMemo(
    () => getActiveSeasons(dashboard?.seasons ?? [], new Date().toISOString())[0] ?? null,
    [dashboard?.seasons],
  );

  const refreshDashboard = useCallback(
    async (targetUserId: string) => {
      if (!client) {
        return;
      }
      const nextDashboard = await loadOnlineDashboard(client, targetUserId);
      setDashboard(nextDashboard);
      onProfileChange(nextDashboard?.profile ?? null);
    },
    [client, onProfileChange],
  );

  useEffect(() => {
    let mounted = true;

    async function boot() {
      if (!client || !configured) {
        onProfileChange(null);
        return;
      }

      try {
        const currentUser = await getCurrentOnlineUser(client);
        if (!mounted) {
          return;
        }
        setUser(currentUser);
        if (currentUser) {
          await refreshDashboard(currentUser.id);
        } else {
          onProfileChange(null);
        }
      } catch (caughtError) {
        if (mounted) {
          setError(caughtError instanceof Error ? caughtError.message : "No se pudo cargar Supabase.");
        }
      }
    }

    void boot();
    return () => {
      mounted = false;
    };
  }, [client, configured, onProfileChange, refreshDashboard]);

  async function runAction(action: () => Promise<string | void>) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await action();
      if (result) {
        setMessage(result);
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Acción online fallida.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAuth() {
    if (!client) {
      return;
    }

    await runAction(async () => {
      const result = authMode === "register"
        ? await signUpOnline(client, { username, email, password })
        : await signInOnline(client, { email, password });
      setUser(result.user);
      onProfileChange(result.profile);
      await refreshDashboard(result.user.id);
      return authMode === "register"
        ? "Cuenta online creada. Si Supabase pide confirmación, revisa tu email."
        : "Sesión online iniciada.";
    });
  }

  async function handleSignOut() {
    if (!client) {
      return;
    }

    await runAction(async () => {
      await signOutOnline(client);
      setUser(null);
      setDashboard(null);
      onProfileChange(null);
      return "Sesión online cerrada.";
    });
  }

  async function handleCreateGroup() {
    if (!client || !user) {
      return;
    }
    await runAction(async () => {
      await createFriendGroup(client, { userId: user.id, name: groupName });
      await refreshDashboard(user.id);
      return "Club creado.";
    });
  }

  async function handleCreateInvite() {
    if (!client || !user || !activeGroup) {
      return;
    }
    await runAction(async () => {
      const invite = await createOnlineInvite(client, { userId: user.id, groupId: activeGroup.id });
      await refreshDashboard(user.id);
      return `Invitación creada: ${invite.code}`;
    });
  }

  async function handleAcceptInvite() {
    if (!client || !user) {
      return;
    }
    await runAction(async () => {
      await acceptOnlineInvite(client, { userId: user.id, code: inviteCode });
      setInviteCode("");
      await refreshDashboard(user.id);
      return "Invitación aceptada.";
    });
  }

  async function handleCreateSeason() {
    if (!client || !activeGroup) {
      return;
    }
    await runAction(async () => {
      await createOnlineSeason(client, {
        groupId: activeGroup.id,
        name: seasonName,
        startsAt: toIsoDate(seasonStart),
        endsAt: toIsoDate(seasonEnd, true),
      });
      if (user) {
        await refreshDashboard(user.id);
      }
      return "Temporada creada.";
    });
  }

  async function handleSync() {
    if (!client || !user) {
      return;
    }
    await runAction(async () => {
      const synced = await syncSavedGamesToSupabase(client, {
        userId: user.id,
        history,
        groupId: activeGroup?.id,
        seasonId: activeSeason?.id,
      });
      await refreshDashboard(user.id);
      return `${synced} partidas sincronizadas online.`;
    });
  }

  if (!configured) {
    return (
      <section className="rounded-lg border border-cyan-300/20 bg-cyan-300/[0.06] p-4">
        <div className="mb-3 flex items-center gap-2 text-white">
          <Wifi aria-hidden="true" className="text-cyan-200" size={18} />
          <h2 className="text-lg font-black">Club online</h2>
        </div>
        <p className="text-sm leading-6 text-white/55">
          Supabase no está configurado todavía. Añade `NEXT_PUBLIC_SUPABASE_URL` y
          `NEXT_PUBLIC_SUPABASE_ANON_KEY`, ejecuta el SQL de `supabase/schema.sql` y reinicia la app.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-white">
            <ShieldCheck aria-hidden="true" className="text-cyan-200" size={18} />
            <h2 className="text-lg font-black">Club online</h2>
          </div>
          <p className="text-sm text-white/45">Ranking, temporadas, perfiles e invitaciones con Supabase.</p>
        </div>
        {user && (
          <button
            className="h-9 rounded-lg border border-white/10 bg-black/30 px-3 text-xs font-bold text-white/65 transition hover:border-rose-300/60 hover:text-rose-100"
            onClick={handleSignOut}
            type="button"
          >
            Salir
          </button>
        )}
      </div>

      {error && <p className="mb-3 rounded-lg border border-rose-300/25 bg-rose-300/10 p-2 text-sm text-rose-100">{error}</p>}
      {message && <p className="mb-3 rounded-lg border border-emerald-300/25 bg-emerald-300/10 p-2 text-sm text-emerald-100">{message}</p>}

      {!user ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-white/10 bg-black/25 p-1">
            {(["login", "register"] as const).map((mode) => (
              <button
                className={[
                  "h-10 rounded-md text-sm font-black transition",
                  authMode === mode ? "bg-cyan-300 text-black" : "text-white/55 hover:bg-white/10 hover:text-white",
                ].join(" ")}
                key={mode}
                onClick={() => setAuthMode(mode)}
                type="button"
              >
                {mode === "login" ? "Entrar" : "Registro"}
              </button>
            ))}
          </div>

          {authMode === "register" && (
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-white/40">Usuario</span>
              <input
                className="h-11 w-full rounded-lg border border-white/10 bg-black/35 px-3 text-white outline-none transition placeholder:text-white/25 focus:border-cyan-300/70"
                onChange={(event) => setUsername(event.target.value)}
                placeholder="tu-nombre"
                value={username}
              />
            </label>
          )}
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-white/40">Email</span>
            <input
              className="h-11 w-full rounded-lg border border-white/10 bg-black/35 px-3 text-white outline-none transition placeholder:text-white/25 focus:border-cyan-300/70"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="ana@email.com"
              type="email"
              value={email}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-white/40">Contraseña</span>
            <input
              className="h-11 w-full rounded-lg border border-white/10 bg-black/35 px-3 text-white outline-none transition placeholder:text-white/25 focus:border-cyan-300/70"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="mínimo 6 caracteres"
              type="password"
              value={password}
            />
          </label>
          <button
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-cyan-300 px-4 font-black text-black transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={busy}
            onClick={handleAuth}
            type="button"
          >
            <LogIn aria-hidden="true" size={18} />
            {authMode === "login" ? "Iniciar sesión online" : "Crear cuenta online"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-cyan-300/25 bg-cyan-300/[0.07] p-3">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-100/65">Perfil</p>
            <p className="mt-1 text-2xl font-black text-white">@{profile?.username ?? "jugador"}</p>
            <p className="text-sm text-white/45">{profile?.displayName ?? user.email}</p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-emerald-300/35 bg-emerald-300 px-3 text-sm font-black text-black transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-45"
              disabled={busy || history.length === 0}
              onClick={handleSync}
              type="button"
            >
              <RefreshCw aria-hidden="true" size={16} />
              Sincronizar historial
            </button>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 text-sm font-bold text-white/70 transition hover:border-cyan-300/50 hover:text-white"
              disabled={busy || !user}
              onClick={() => user && void refreshDashboard(user.id)}
              type="button"
            >
              <RefreshCw aria-hidden="true" size={16} />
              Refrescar
            </button>
          </div>

          <div className="rounded-lg border border-white/10 bg-black/25 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-white/50">
              <UsersRound aria-hidden="true" size={15} />
              Club de amigos
            </div>
            {activeGroup ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.06] p-3">
                  <div>
                    <p className="font-black text-white">{activeGroup.name}</p>
                    <p className="text-xs text-white/40">Código base: {activeGroup.joinCode}</p>
                  </div>
                  <button
                    className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-black/30 text-white/65 transition hover:border-cyan-300/50 hover:text-white"
                    onClick={handleCreateInvite}
                    title="Crear invitación"
                    type="button"
                  >
                    <Clipboard aria-hidden="true" size={15} />
                  </button>
                </div>
                {dashboard?.invites.slice(0, 3).map((invite) => (
                  <p className="rounded-md bg-cyan-300/10 px-2 py-1 text-sm font-black text-cyan-100" key={invite.id}>
                    Invitación: {invite.code}
                  </p>
                ))}
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  className="h-10 min-w-0 flex-1 rounded-lg border border-white/10 bg-black/35 px-3 text-sm font-bold text-white outline-none focus:border-cyan-300/70"
                  onChange={(event) => setGroupName(event.target.value)}
                  placeholder="Nombre del club"
                  value={groupName}
                />
                <button className="h-10 rounded-lg bg-cyan-300 px-3 text-sm font-black text-black" onClick={handleCreateGroup} type="button">
                  Crear
                </button>
              </div>
            )}
            <div className="mt-3 flex gap-2">
              <input
                className="h-10 min-w-0 flex-1 rounded-lg border border-white/10 bg-black/35 px-3 text-sm font-bold uppercase text-white outline-none focus:border-cyan-300/70"
                onChange={(event) => setInviteCode(event.target.value)}
                placeholder="Código invitación"
                value={inviteCode}
              />
              <button className="h-10 rounded-lg border border-white/10 bg-white/10 px-3 text-sm font-bold text-white" onClick={handleAcceptInvite} type="button">
                Unirme
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-black/25 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-white/50">
              <CalendarDays aria-hidden="true" size={15} />
              Temporadas
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <input className="h-10 rounded-lg border border-white/10 bg-black/35 px-3 text-sm font-bold text-white outline-none" onChange={(event) => setSeasonName(event.target.value)} value={seasonName} />
              <input className="h-10 rounded-lg border border-white/10 bg-black/35 px-3 text-sm font-bold text-white outline-none" onChange={(event) => setSeasonStart(event.target.value)} type="date" value={seasonStart} />
              <input className="h-10 rounded-lg border border-white/10 bg-black/35 px-3 text-sm font-bold text-white outline-none" onChange={(event) => setSeasonEnd(event.target.value)} type="date" value={seasonEnd} />
            </div>
            <button className="mt-2 h-10 rounded-lg bg-amber-200 px-3 text-sm font-black text-black disabled:opacity-45" disabled={!activeGroup || busy} onClick={handleCreateSeason} type="button">
              Crear temporada
            </button>
            <div className="mt-3 space-y-1">
              {dashboard?.seasons.slice(0, 4).map((season) => (
                <p className="rounded-md bg-white/[0.06] px-2 py-1 text-sm text-white/70" key={season.id}>
                  {season.name} · {season.startsAt.slice(0, 10)} → {season.endsAt.slice(0, 10)}
                </p>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-black/25 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-white/50">
              <Trophy aria-hidden="true" size={15} />
              Ranking online
            </div>
            {dashboard?.leaderboard.length ? (
              <div className="space-y-2">
                {dashboard.leaderboard.slice(0, 8).map((entry) => (
                  <div className="flex items-center justify-between rounded-lg bg-white/[0.06] p-2" key={entry.userId}>
                    <span className="min-w-0 text-sm font-bold text-white">
                      {entry.rank}. @{entry.username}
                    </span>
                    <span className="text-right text-sm">
                      <span className="block font-black text-amber-200">{entry.bestScore}</span>
                      <span className="text-[10px] text-white/35">media {entry.averageScore}</span>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/45">Sin partidas online todavía. Sincroniza tu historial para empezar.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
