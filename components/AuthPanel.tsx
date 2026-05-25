"use client";

import { useState } from "react";
import { LogIn, LogOut, ShieldCheck, UserPlus, UsersRound } from "lucide-react";

import type { UserAccount } from "@/types/bowling";

interface AuthPanelProps {
  accountHistoryCount: number;
  accountsCount: number;
  currentUser: UserAccount | null;
  guestHistoryCount: number;
  onClaimGuestHistory: () => void;
  onLogin: (email: string, password: string) => void;
  onLogout: () => void;
  onRegister: (name: string, email: string, password: string) => void;
}

type AuthMode = "login" | "register";

export function AuthPanel({
  accountHistoryCount,
  accountsCount,
  currentUser,
  guestHistoryCount,
  onClaimGuestHistory,
  onLogin,
  onLogout,
  onRegister,
}: AuthPanelProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  function submitAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    try {
      if (mode === "register") {
        onRegister(name, email, password);
      } else {
        onLogin(email, password);
      }

      setName("");
      setEmail("");
      setPassword("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo completar la acción.");
    }
  }

  if (currentUser) {
    return (
      <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2 text-white">
              <ShieldCheck size={18} className="text-emerald-200" />
              <h2 className="text-lg font-black">Cuenta</h2>
            </div>
            <p className="text-sm text-white/45">Perfil local activo en este dispositivo.</p>
          </div>
          <button
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/10 bg-black/35 text-white transition hover:border-rose-300/60 hover:text-rose-200"
            onClick={onLogout}
            title="Cerrar sesión"
            type="button"
          >
            <LogOut size={17} />
          </button>
        </div>

        <div className="rounded-lg border border-emerald-300/20 bg-emerald-300/[0.07] p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-100/60">Sesión iniciada</p>
          <h3 className="mt-1 text-2xl font-black text-white">{currentUser.name}</h3>
          <p className="mt-1 text-sm text-white/50">{currentUser.email}</p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-white/10 bg-black/30 p-3">
            <p className="text-2xl font-black text-amber-200">{accountHistoryCount}</p>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/40">Partidas cuenta</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/30 p-3">
            <p className="text-2xl font-black text-cyan-200">{accountsCount}</p>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/40">Perfiles locales</p>
          </div>
        </div>

        {guestHistoryCount > 0 && (
          <button
            className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-4 font-black text-cyan-100 transition hover:border-cyan-200/70"
            onClick={onClaimGuestHistory}
            type="button"
          >
            <UsersRound size={18} />
            Importar {guestHistoryCount} partidas de invitado
          </button>
        )}
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
      <div className="mb-4">
        <div className="mb-2 flex items-center gap-2 text-white">
          <ShieldCheck size={18} className="text-cyan-200" />
          <h2 className="text-lg font-black">Cuenta</h2>
        </div>
        <p className="text-sm text-white/45">Crea un perfil local para separar historial y estadísticas.</p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg border border-white/10 bg-black/25 p-1">
        {(["login", "register"] as const).map((nextMode) => (
          <button
            className={[
              "h-10 rounded-md text-sm font-black transition",
              mode === nextMode ? "bg-cyan-300 text-black" : "text-white/55 hover:bg-white/10 hover:text-white",
            ].join(" ")}
            key={nextMode}
            onClick={() => {
              setMode(nextMode);
              setMessage(null);
            }}
            type="button"
          >
            {nextMode === "login" ? "Entrar" : "Registro"}
          </button>
        ))}
      </div>

      <form className="space-y-3" onSubmit={submitAuth}>
        {mode === "register" && (
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-white/40">Nombre</span>
            <input
              className="h-11 w-full rounded-lg border border-white/10 bg-black/35 px-3 text-white outline-none transition placeholder:text-white/25 focus:border-cyan-300/70"
              onChange={(event) => setName(event.target.value)}
              placeholder="Ana"
              value={name}
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
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-cyan-300 px-4 font-black text-black transition hover:bg-cyan-200"
          type="submit"
        >
          {mode === "register" ? <UserPlus size={18} /> : <LogIn size={18} />}
          {mode === "register" ? "Crear cuenta" : "Iniciar sesión"}
        </button>
      </form>

      {message && <p className="mt-3 rounded-lg border border-rose-300/25 bg-rose-300/10 p-3 text-sm text-rose-100">{message}</p>}

      <p className="mt-4 text-xs leading-5 text-white/35">
        V5 usa cuentas locales por dispositivo. La sincronización real en la nube queda preparada para la siguiente
        fase con backend.
      </p>
    </section>
  );
}
