import type { FrameScore } from "@/types/bowling";

interface FrameBoxProps {
  frame: FrameScore;
  isActive: boolean;
}

export function FrameBox({ frame, isActive }: FrameBoxProps) {
  const rollSlots = frame.frameNumber === 10 ? 3 : 2;
  const cells = Array.from({ length: rollSlots }, (_, index) => frame.symbols[index] ?? "");

  const kindLabel =
    frame.kind === "strike"
      ? "strike"
      : frame.kind === "spare"
        ? "spare"
        : frame.kind === "open"
          ? "frame abierto"
          : "frame en curso";
  const scorePart = frame.cumulativeScore != null ? ` ${frame.cumulativeScore} puntos acumulados.` : "";
  const ariaLabel = `Frame ${frame.frameNumber}${isActive ? ", turno actual" : ""}. ${kindLabel}.${scorePart}`;

  return (
    <article
      aria-current={isActive ? "step" : undefined}
      aria-label={ariaLabel}
      className={[
        "min-h-[112px] rounded-lg border bg-white/[0.045] p-2.5 shadow-[0_18px_60px_rgba(0,0,0,0.22)] transition",
        isActive
          ? "border-cyan-300/70 bg-cyan-300/[0.08] shadow-cyan-950/40"
          : "border-white/10 hover:border-white/20",
      ].join(" ")}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
          Frame
        </span>
        <span className="grid h-7 w-7 place-items-center rounded-md bg-white/10 text-sm font-bold text-white">
          {frame.frameNumber}
        </span>
      </div>

      <div
        className="grid overflow-hidden rounded-md border border-white/10 bg-black/35"
        style={{ gridTemplateColumns: `repeat(${rollSlots}, minmax(0, 1fr))` }}
      >
        {cells.map((symbol, index) => (
          <div
            className="grid h-10 place-items-center border-r border-white/10 text-lg font-black text-white last:border-r-0"
            key={`${frame.frameNumber}-${index}`}
          >
            {symbol || <span className="text-white/20">·</span>}
          </div>
        ))}
      </div>

      <div className="mt-3 flex h-8 items-center justify-between">
        <span className="text-xs text-white/45">Acum.</span>
        <span className="text-xl font-black text-amber-200">
          {frame.cumulativeScore ?? "—"}
        </span>
      </div>
    </article>
  );
}
