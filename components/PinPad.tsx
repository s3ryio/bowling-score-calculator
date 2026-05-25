import { RotateCcw, Undo2 } from "lucide-react";

interface PinPadProps {
  options: number[];
  canUndo: boolean;
  className?: string;
  disabled?: boolean;
  error: string | null;
  onReset: () => void;
  onRoll: (pins: number) => void;
  onUndo: () => void;
}

export function PinPad({
  options,
  canUndo,
  className = "",
  disabled = false,
  error,
  onReset,
  onRoll,
  onUndo,
}: PinPadProps) {
  const allowed = new Set(options);

  return (
    <section
      aria-label="Registrar tirada"
      className={[
        "rounded-lg border border-white/10 bg-slate-950/90 p-4 shadow-[0_18px_70px_rgba(0,0,0,0.34)] backdrop-blur-xl",
        className,
      ].join(" ")}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-white/60">Tirada</h2>
          <p className="mt-1 text-sm text-white/45">Pulsa los bolos derribados.</p>
        </div>
        <div className="flex gap-2">
          <button
            aria-label="Borrar última tirada"
            className="grid h-11 w-11 place-items-center rounded-lg border border-white/10 bg-black/35 text-white transition hover:border-cyan-300/60 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-35"
            disabled={!canUndo}
            onClick={onUndo}
            title="Borrar última tirada (Backspace o Z)"
            type="button"
          >
            <Undo2 aria-hidden="true" size={19} />
          </button>
          <button
            aria-label="Reiniciar partida"
            className="grid h-11 w-11 place-items-center rounded-lg border border-white/10 bg-black/35 text-white transition hover:border-rose-300/60 hover:text-rose-200"
            onClick={onReset}
            title="Reiniciar partida (R)"
            type="button"
          >
            <RotateCcw aria-hidden="true" size={19} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {Array.from({ length: 11 }, (_, pins) => {
          const isAllowed = allowed.has(pins) && !disabled;
          const label =
            pins === 10
              ? "Strike: 10 bolos"
              : pins === 0
                ? "Tirada nula: 0 bolos"
                : `Tirada: ${pins} ${pins === 1 ? "bolo" : "bolos"}`;

          return (
            <button
              aria-label={label}
              className={[
                "h-14 rounded-lg border text-lg font-black transition active:scale-[0.98]",
                pins === 10
                  ? "border-amber-200/40 bg-amber-300 text-black shadow-[0_0_34px_rgba(251,191,36,0.28)]"
                  : "border-white/10 bg-black/40 text-white hover:border-emerald-300/60 hover:bg-emerald-300/10",
                !isAllowed ? "cursor-not-allowed opacity-30 hover:border-white/10 hover:bg-black/35" : "",
              ].join(" ")}
              disabled={!isAllowed}
              key={pins}
              onClick={() => onRoll(pins)}
              title={pins === 10 ? "Strike (tecla S)" : `Tirada de ${pins} (tecla ${pins})`}
              type="button"
            >
              {pins === 10 ? "X" : pins}
            </button>
          );
        })}
      </div>

      <p aria-live="polite" className="mt-3 min-h-5 text-sm font-medium text-rose-200" role="status">
        {error}
      </p>
    </section>
  );
}
