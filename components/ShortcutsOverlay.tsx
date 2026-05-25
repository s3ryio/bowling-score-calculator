"use client";

import { useEffect, useRef } from "react";
import { Keyboard, X } from "lucide-react";

interface ShortcutsOverlayProps {
  open: boolean;
  onClose: () => void;
}

interface ShortcutRow {
  keys: string[];
  description: string;
}

const shortcuts: ShortcutRow[] = [
  { keys: ["0", "–", "9"], description: "Registrar tirada con ese número de bolos." },
  { keys: ["S"], description: "Strike (10 bolos)." },
  { keys: ["/"], description: "Spare: tira el resto de bolos del frame actual." },
  { keys: ["⌫", "/", "Z"], description: "Deshacer la última tirada." },
  { keys: ["R"], description: "Reiniciar la partida (pide confirmación)." },
  { keys: ["?", "/", "H"], description: "Mostrar u ocultar esta ayuda." },
];

export function ShortcutsOverlay({ open, onClose }: ShortcutsOverlayProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Cerrar con Escape y enfocar el botón de cerrar al abrir.
  useEffect(() => {
    if (!open) {
      return;
    }

    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      aria-labelledby="shortcuts-title"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
    >
      <button
        aria-label="Cerrar ayuda de atajos"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        tabIndex={-1}
        type="button"
      />
      <div className="relative w-full max-w-md rounded-lg border border-white/10 bg-slate-950/95 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.4)]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2 text-white">
              <Keyboard size={18} className="text-cyan-200" />
              <h2 className="text-lg font-black" id="shortcuts-title">
                Atajos de teclado
              </h2>
            </div>
            <p className="text-sm text-white/45">
              Funcionan en la pestaña de partida cuando no estás escribiendo.
            </p>
          </div>
          <button
            aria-label="Cerrar"
            className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-black/35 text-white transition hover:border-rose-300/60 hover:text-rose-200"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <X size={17} />
          </button>
        </div>

        <ul className="space-y-2">
          {shortcuts.map((row) => (
            <li
              className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-black/30 p-3"
              key={row.description}
            >
              <span className="text-sm text-white/70">{row.description}</span>
              <span className="flex shrink-0 items-center gap-1">
                {row.keys.map((key) =>
                  key === "/" || key === "–" ? (
                    <span className="text-xs text-white/35" key={`${row.description}-sep-${key}`}>
                      {key === "/" ? "o" : "–"}
                    </span>
                  ) : (
                    <kbd
                      className="inline-flex min-w-7 items-center justify-center rounded-md border border-white/15 bg-white/10 px-2 py-0.5 text-xs font-black text-white"
                      key={`${row.description}-${key}`}
                    >
                      {key}
                    </kbd>
                  ),
                )}
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-xs text-white/35">
          Pulsa <kbd className="rounded border border-white/15 bg-white/10 px-1.5 py-0.5 text-[10px] font-bold">?</kbd> en
          cualquier momento para volver a abrir esta ayuda.
        </p>
      </div>
    </div>
  );
}
