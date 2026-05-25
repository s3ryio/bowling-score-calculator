"use client";

import { useEffect } from "react";

export interface KeyboardShortcutHandlers {
  /** Pulsa un número de bolos (0-10). El componente debe filtrar si la tirada no es legal. */
  onRoll?: (pins: number) => void;
  /** Atajo "S": strike. */
  onStrike?: () => void;
  /** Atajo "/": spare (resto de bolos del frame actual). */
  onSpare?: () => void;
  /** Atajo "Backspace" o "z": deshacer última tirada. */
  onUndo?: () => void;
  /** Atajo "r": reiniciar partida (con confirm dentro del callback). */
  onReset?: () => void;
  /** Atajo "?": mostrar/ocultar el overlay de ayuda. */
  onToggleHelp?: () => void;
  /** Si false, ignora todos los atajos (útil cuando no estás en la pestaña de partida o hay un modal). */
  enabled?: boolean;
}

/**
 * Atajos para registrar tiradas y controlar la partida con teclado.
 *
 * - 0-9: tirada con ese número de bolos (10 = strike, pero está mapeado por separado).
 * - S: strike (10 bolos).
 * - / o \: spare (rellena el frame).
 * - Backspace o Z: deshacer.
 * - R: reiniciar partida (el handler debe confirmar).
 * - ? o H: abrir/cerrar overlay de ayuda.
 *
 * Ignora teclas si:
 * - el foco está en un input, textarea o elemento contenteditable.
 * - Ctrl/Cmd/Alt están pulsados (para no chocar con atajos del navegador).
 */
export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers) {
  const { enabled = true } = handlers;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }

    function isTypingTarget(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) {
        return false;
      }

      const tag = target.tagName;

      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        return true;
      }

      return target.isContentEditable;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      if (isTypingTarget(event.target)) {
        return;
      }

      const key = event.key;

      // 0–9 → tirada
      if (/^[0-9]$/.test(key)) {
        const pins = Number.parseInt(key, 10);
        handlers.onRoll?.(pins);
        event.preventDefault();
        return;
      }

      switch (key) {
        case "s":
        case "S":
          handlers.onStrike?.();
          event.preventDefault();
          return;
        case "/":
        case "\\":
          handlers.onSpare?.();
          event.preventDefault();
          return;
        case "Backspace":
        case "z":
        case "Z":
          handlers.onUndo?.();
          event.preventDefault();
          return;
        case "r":
        case "R":
          handlers.onReset?.();
          event.preventDefault();
          return;
        case "?":
        case "h":
        case "H":
          handlers.onToggleHelp?.();
          event.preventDefault();
          return;
        default:
          return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, handlers]);
}
