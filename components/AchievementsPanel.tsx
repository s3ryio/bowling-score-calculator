import {
  Award,
  BarChart3,
  CircleDot,
  Crown,
  Flame,
  Gamepad2,
  Lock,
  ShieldCheck,
  Sparkles,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { summarizeAchievements, type AchievementProgress, type AchievementTier } from "@/lib/bowling-achievements";

interface AchievementsPanelProps {
  achievements: AchievementProgress[];
}

const ICON_MAP: Record<string, LucideIcon> = {
  Award,
  BarChart3,
  CircleDot,
  Crown,
  Flame,
  Gamepad2,
  ShieldCheck,
  Sparkles,
  Trophy,
  Zap,
};

const TIER_STYLES: Record<AchievementTier, { ring: string; text: string; bg: string; label: string }> = {
  bronze: {
    ring: "border-amber-700/40",
    text: "text-amber-200",
    bg: "bg-amber-900/20",
    label: "Bronce",
  },
  silver: {
    ring: "border-slate-300/40",
    text: "text-slate-100",
    bg: "bg-slate-300/10",
    label: "Plata",
  },
  gold: {
    ring: "border-amber-300/50",
    text: "text-amber-100",
    bg: "bg-amber-300/15",
    label: "Oro",
  },
  platinum: {
    ring: "border-fuchsia-300/50",
    text: "text-fuchsia-100",
    bg: "bg-fuchsia-300/15",
    label: "Platino",
  },
};

function formatDate(value?: string): string {
  if (!value) {
    return "";
  }
  try {
    return new Intl.DateTimeFormat("es-ES", { dateStyle: "medium" }).format(new Date(value));
  } catch {
    return value;
  }
}

export function AchievementsPanel({ achievements }: AchievementsPanelProps) {
  const summary = summarizeAchievements(achievements);
  const completion = summary.total === 0 ? 0 : Math.round((summary.unlockedCount / summary.total) * 100);
  const sorted = [...achievements].sort((a, b) => {
    if (a.unlocked !== b.unlocked) {
      return a.unlocked ? -1 : 1;
    }
    return a.definition.title.localeCompare(b.definition.title);
  });

  return (
    <section
      aria-label="Logros"
      className="rounded-lg border border-white/10 bg-white/[0.045] p-4"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-white">
            <Trophy aria-hidden="true" className="text-amber-200" size={18} />
            <h2 className="text-lg font-black">Logros</h2>
          </div>
          <p className="text-sm text-white/45">
            {summary.unlockedCount} de {summary.total} desbloqueados.
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-amber-200">{completion}%</p>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/40">Completado</p>
        </div>
      </div>

      <div
        aria-label={`Progreso global ${completion} por ciento`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={completion}
        className="mb-4 h-2 w-full overflow-hidden rounded-full bg-white/10"
        role="progressbar"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-amber-300 to-fuchsia-400"
          style={{ width: `${completion}%` }}
        />
      </div>

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {sorted.map((entry) => {
          const Icon = ICON_MAP[entry.definition.iconName] ?? Trophy;
          const tier = TIER_STYLES[entry.definition.tier];
          const showProgress = !entry.unlocked && entry.progress && entry.progress.target > 0;
          const progressPct = showProgress
            ? Math.min(100, Math.round((entry.progress!.current / entry.progress!.target) * 100))
            : 100;

          return (
            <li
              aria-label={`${entry.definition.title}. ${entry.definition.description} ${
                entry.unlocked ? "Desbloqueado" : "Bloqueado"
              }`}
              className={[
                "relative rounded-lg border p-3 transition",
                entry.unlocked
                  ? `${tier.ring} ${tier.bg}`
                  : "border-white/10 bg-black/30 opacity-75 grayscale",
              ].join(" ")}
              key={entry.definition.id}
              title={entry.definition.description}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <span
                  aria-hidden="true"
                  className={[
                    "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
                    entry.unlocked ? tier.bg : "bg-white/5",
                  ].join(" ")}
                >
                  {entry.unlocked ? (
                    <Icon className={tier.text} size={18} />
                  ) : (
                    <Lock className="text-white/40" size={16} />
                  )}
                </span>
                <span className={`rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${tier.text}`}>
                  {tier.label}
                </span>
              </div>
              <h3 className="text-sm font-black leading-tight text-white">{entry.definition.title}</h3>
              <p className="mt-1 line-clamp-2 text-xs text-white/55">{entry.definition.description}</p>

              {showProgress && (
                <div className="mt-2">
                  <div
                    aria-hidden="true"
                    className="h-1.5 w-full overflow-hidden rounded-full bg-white/10"
                  >
                    <div
                      className="h-full rounded-full bg-cyan-400"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-white/40">
                    {entry.progress!.current} / {entry.progress!.target}
                  </p>
                </div>
              )}

              {entry.unlocked && entry.unlockedAt && (
                <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-white/40">
                  {entry.unlockedBy ? `${entry.unlockedBy} · ` : ""}
                  {formatDate(entry.unlockedAt)}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
