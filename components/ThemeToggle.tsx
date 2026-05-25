"use client";

import { Monitor, Moon, Sun } from "lucide-react";

import type { ResolvedTheme, ThemePreference } from "@/hooks/useTheme";

interface ThemeToggleProps {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  onChange: (next: ThemePreference) => void;
}

const options: Array<{ value: ThemePreference; icon: typeof Sun; label: string }> = [
  { value: "light", icon: Sun, label: "Claro" },
  { value: "system", icon: Monitor, label: "Sistema" },
  { value: "dark", icon: Moon, label: "Oscuro" },
];

export function ThemeToggle({ preference, resolvedTheme, onChange }: ThemeToggleProps) {
  return (
    <div
      aria-label="Tema visual"
      className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-black/30 p-1 text-xs font-bold"
      role="group"
    >
      {options.map((option) => {
        const Icon = option.icon;
        const isActive = preference === option.value;
        const ariaLabel =
          option.value === "system"
            ? `Tema según sistema (actualmente ${resolvedTheme === "light" ? "claro" : "oscuro"})`
            : `Tema ${option.label.toLowerCase()}`;

        return (
          <button
            aria-label={ariaLabel}
            aria-pressed={isActive}
            className={[
              "grid h-8 w-8 place-items-center rounded-md transition",
              isActive
                ? "bg-cyan-300 text-black"
                : "text-white/55 hover:bg-white/10 hover:text-white",
            ].join(" ")}
            key={option.value}
            onClick={() => onChange(option.value)}
            title={option.label}
            type="button"
          >
            <Icon size={15} />
          </button>
        );
      })}
    </div>
  );
}
