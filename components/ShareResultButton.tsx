"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Download, ImageIcon, Loader2, Share2 } from "lucide-react";

import { createShareText } from "@/lib/bowling-analytics";
import {
  canvasToBlob,
  downloadBlob,
  renderGameToCanvas,
  shareImageBlob,
  suggestImageFilename,
} from "@/lib/bowling-export";
import { useTheme } from "@/hooks/useTheme";
import type { SavedGame } from "@/types/bowling";

interface ShareResultButtonProps {
  game: SavedGame;
}

type TextStatus = "idle" | "copied" | "manual";
type ImageStatus = "idle" | "rendering" | "shared" | "downloaded" | "error";

export function ShareResultButton({ game }: ShareResultButtonProps) {
  const [textStatus, setTextStatus] = useState<TextStatus>("idle");
  const [imageStatus, setImageStatus] = useState<ImageStatus>("idle");
  const [imageError, setImageError] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();
  const shareText = useMemo(() => createShareText(game), [game]);

  async function shareTextResult() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Bowling Score Calculator",
          text: shareText,
        });
        setTextStatus("copied");
        return;
      } catch {
        setTextStatus("idle");
        return;
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareText);
        setTextStatus("copied");
        return;
      } catch {
        setTextStatus("manual");
        return;
      }
    }

    setTextStatus("manual");
  }

  async function shareImageResult() {
    setImageError(null);
    setImageStatus("rendering");

    try {
      const canvas = renderGameToCanvas(game, { theme: resolvedTheme });
      const blob = await canvasToBlob(canvas, "image/png");
      const filename = suggestImageFilename(game);

      const shared = await shareImageBlob(blob, filename, "Bowling — Resultado");
      if (shared) {
        setImageStatus("shared");
        return;
      }

      downloadBlob(blob, filename);
      setImageStatus("downloaded");
    } catch (error) {
      setImageStatus("error");
      setImageError(error instanceof Error ? error.message : "No se pudo generar la imagen.");
    }
  }

  const imageLabel =
    imageStatus === "rendering"
      ? "Generando..."
      : imageStatus === "shared"
        ? "Imagen compartida"
        : imageStatus === "downloaded"
          ? "Imagen descargada"
          : imageStatus === "error"
            ? "Reintentar"
            : "Imagen del resultado";

  const ImageIconComponent =
    imageStatus === "rendering"
      ? Loader2
      : imageStatus === "shared"
        ? Check
        : imageStatus === "downloaded"
          ? Download
          : ImageIcon;

  const textLabel =
    textStatus === "copied"
      ? "Resumen copiado"
      : textStatus === "manual"
        ? "Copia manual"
        : "Compartir texto";

  const TextIconComponent =
    textStatus === "copied" ? Check : textStatus === "manual" ? Copy : Share2;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          aria-busy={imageStatus === "rendering"}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-amber-200/40 bg-amber-300/15 px-4 font-black text-amber-100 transition hover:border-amber-200/70 hover:bg-amber-300/25 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={imageStatus === "rendering"}
          onClick={shareImageResult}
          type="button"
        >
          <ImageIconComponent
            aria-hidden="true"
            className={imageStatus === "rendering" ? "animate-spin" : ""}
            size={18}
          />
          {imageLabel}
        </button>

        <button
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-4 font-black text-cyan-100 transition hover:border-cyan-200/70 hover:bg-cyan-300/15"
          onClick={shareTextResult}
          type="button"
        >
          <TextIconComponent aria-hidden="true" size={18} />
          {textLabel}
        </button>
      </div>

      {imageError && (
        <p className="rounded-lg border border-rose-300/25 bg-rose-300/10 p-2 text-xs text-rose-100">
          {imageError}
        </p>
      )}

      {textStatus === "manual" && (
        <textarea
          aria-label="Resumen del resultado"
          className="h-24 w-full resize-none rounded-lg border border-white/10 bg-black/35 p-3 text-xs text-white/70 outline-none"
          readOnly
          value={shareText}
        />
      )}
    </div>
  );
}
