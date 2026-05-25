import { calculateGameScore } from "@/lib/bowling-score";
import type { SavedGame, SavedPlayerResult } from "@/types/bowling";

// Dimensiones lógicas del canvas (se multiplican por DPR al renderizar).
const CARD_WIDTH = 1200;
const HEADER_HEIGHT = 170;
const ROW_HEIGHT = 88;
const FOOTER_HEIGHT = 70;
const HORIZONTAL_PADDING = 56;

// Layout de la tabla (en coordenadas lógicas).
const NAME_COL_WIDTH = 220;
const TOTAL_COL_WIDTH = 130;
const FRAME_GAP = 6;
const TENTH_FRAME_EXTRA = 28; // más ancho para 3 sub-celdas

interface Theme {
  background: string;
  surface: string;
  surfaceMuted: string;
  surfaceWinner: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string; // cyan
  amber: string;
  emerald: string;
}

const DARK_THEME: Theme = {
  background: "#020617",
  surface: "#0f172a",
  surfaceMuted: "#172033",
  surfaceWinner: "rgba(251, 191, 36, 0.10)",
  border: "rgba(255, 255, 255, 0.10)",
  text: "#f8fafc",
  textMuted: "rgba(248, 250, 252, 0.55)",
  accent: "#67e8f9",
  amber: "#fcd34d",
  emerald: "#6ee7b7",
};

const LIGHT_THEME: Theme = {
  background: "#f1f5f9",
  surface: "#ffffff",
  surfaceMuted: "#f8fafc",
  surfaceWinner: "rgba(217, 119, 6, 0.10)",
  border: "rgba(15, 23, 42, 0.12)",
  text: "#0f172a",
  textMuted: "rgba(15, 23, 42, 0.55)",
  accent: "#0e7490",
  amber: "#b45309",
  emerald: "#047857",
};

export interface RenderOptions {
  theme?: "dark" | "light";
  /** Si true, marca al ganador con un fondo y corona. */
  highlightWinner?: boolean;
  /** Si false, no dibuja el branding pie. */
  showBranding?: boolean;
  /** Anchura objetivo final en px (por defecto 1200). */
  width?: number;
}

function formatDate(value: string): string {
  try {
    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function frameSymbolsForPlayer(rolls: number[]): Array<{ symbols: string[]; cumulative: number | null; isStrike: boolean; isSpare: boolean }> {
  try {
    const score = calculateGameScore(rolls);
    return score.frames.map((frame) => ({
      symbols: frame.symbols,
      cumulative: frame.cumulativeScore,
      isStrike: frame.kind === "strike",
      isSpare: frame.kind === "spare",
    }));
  } catch {
    return Array.from({ length: 10 }, () => ({
      symbols: [],
      cumulative: null,
      isStrike: false,
      isSpare: false,
    }));
  }
}

function rankByMode(players: SavedPlayerResult[], mode: SavedGame["mode"]): SavedPlayerResult[] {
  void mode;
  const score = (p: SavedPlayerResult) => p.adjustedScore ?? p.score;
  return [...players].sort((a, b) => score(b) - score(a));
}

function computeWinnerIds(players: SavedPlayerResult[], mode: SavedGame["mode"]): Set<string> {
  if (players.length === 0) {
    return new Set();
  }
  const ranked = rankByMode(players, mode);
  const topScore = ranked[0].adjustedScore ?? ranked[0].score;
  return new Set(
    ranked
      .filter((player) => (player.adjustedScore ?? player.score) === topScore)
      .map((player) => player.id),
  );
}

/**
 * Renderiza el scorecard en un canvas. Devuelve el canvas listo para exportar.
 * El canvas usa DPR=2 para nitidez; las dimensiones lógicas son CARD_WIDTH × calculado.
 */
export function renderGameToCanvas(game: SavedGame, options: RenderOptions = {}): HTMLCanvasElement {
  const themeName = options.theme ?? "dark";
  const theme = themeName === "light" ? LIGHT_THEME : DARK_THEME;
  const players = game.players;
  const playersCount = players.length;
  const cardHeight = HEADER_HEIGHT + ROW_HEIGHT * playersCount + FOOTER_HEIGHT;
  const dpr = 2;
  const width = options.width ?? CARD_WIDTH;
  const scale = width / CARD_WIDTH;

  const canvas = document.createElement("canvas");
  canvas.width = width * dpr;
  canvas.height = cardHeight * scale * dpr;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("No se pudo crear el contexto del canvas.");
  }
  ctx.scale(dpr * scale, dpr * scale);

  drawBackground(ctx, theme, CARD_WIDTH, cardHeight);
  drawHeader(ctx, game, theme);
  drawTable(ctx, game, theme, options.highlightWinner !== false);
  if (options.showBranding !== false) {
    drawFooter(ctx, theme, cardHeight);
  }

  return canvas;
}

function drawBackground(ctx: CanvasRenderingContext2D, theme: Theme, width: number, height: number) {
  // Fondo degradado.
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  if (theme === DARK_THEME) {
    gradient.addColorStop(0, "#030712");
    gradient.addColorStop(0.5, "#0b1024");
    gradient.addColorStop(1, "#020617");
  } else {
    gradient.addColorStop(0, "#f8fafc");
    gradient.addColorStop(0.5, "#e2e8f0");
    gradient.addColorStop(1, "#cbd5e1");
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Halo cyan en la esquina superior izquierda.
  const halo1 = ctx.createRadialGradient(width * 0.15, 0, 0, width * 0.15, 0, 380);
  halo1.addColorStop(0, theme === DARK_THEME ? "rgba(34, 211, 238, 0.20)" : "rgba(14, 165, 233, 0.18)");
  halo1.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = halo1;
  ctx.fillRect(0, 0, width, height);

  // Halo ámbar en la derecha.
  const halo2 = ctx.createRadialGradient(width * 0.9, 0, 0, width * 0.9, 0, 360);
  halo2.addColorStop(0, theme === DARK_THEME ? "rgba(251, 191, 36, 0.18)" : "rgba(217, 119, 6, 0.16)");
  halo2.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = halo2;
  ctx.fillRect(0, 0, width, height);
}

function drawHeader(ctx: CanvasRenderingContext2D, game: SavedGame, theme: Theme) {
  ctx.textBaseline = "alphabetic";

  // Eyebrow: BOWLING SCORE CALCULATOR
  ctx.fillStyle = theme.textMuted;
  ctx.font = "700 14px Inter, system-ui, -apple-system, sans-serif";
  ctx.fillText("BOWLING SCORE CALCULATOR", HORIZONTAL_PADDING, 50);

  // Título principal: nombre del ganador o "Resultado"
  const ranked = rankByMode(game.players, game.mode);
  const winner = ranked[0];
  const title = winner ? `${winner.name} · ${winner.adjustedScore ?? winner.score}` : "Resultado";
  ctx.fillStyle = theme.text;
  ctx.font = "900 42px Inter, system-ui, -apple-system, sans-serif";
  ctx.fillText(title, HORIZONTAL_PADDING, 100);

  // Subtítulo: fecha de la partida
  const subtitle = formatDate(game.date);
  ctx.fillStyle = theme.textMuted;
  ctx.font = "500 18px Inter, system-ui, -apple-system, sans-serif";
  ctx.fillText(subtitle, HORIZONTAL_PADDING, 132);

  // Chip de score en la derecha
  if (winner) {
    const chipText = `${winner.adjustedScore ?? winner.score}`;
    ctx.font = "900 56px Inter, system-ui, -apple-system, sans-serif";
    const textMetrics = ctx.measureText(chipText);
    const chipWidth = textMetrics.width;
    ctx.fillStyle = theme.amber;
    ctx.textAlign = "right";
    ctx.fillText(chipText, CARD_WIDTH - HORIZONTAL_PADDING, 110);
    ctx.font = "700 13px Inter, system-ui, -apple-system, sans-serif";
    ctx.fillStyle = theme.textMuted;
    ctx.fillText(
      "PUNTUACIÓN GANADORA",
      CARD_WIDTH - HORIZONTAL_PADDING,
      135,
    );
    ctx.textAlign = "left";
    void chipWidth; // referencia para evitar warning si no lo usamos
  }
}

function drawTable(
  ctx: CanvasRenderingContext2D,
  game: SavedGame,
  theme: Theme,
  highlightWinner: boolean,
) {
  const tableX = HORIZONTAL_PADDING;
  const tableY = HEADER_HEIGHT;
  const tableWidth = CARD_WIDTH - HORIZONTAL_PADDING * 2;
  const winnerIds = highlightWinner ? computeWinnerIds(game.players, game.mode) : new Set<string>();

  // Calcular ancho de cada frame
  const frameAreaWidth = tableWidth - NAME_COL_WIDTH - TOTAL_COL_WIDTH;
  const tenthExtraWidth = TENTH_FRAME_EXTRA;
  const standardFrames = 9;
  const totalFrameWidth = frameAreaWidth - tenthExtraWidth - FRAME_GAP * 10;
  const frameWidth = totalFrameWidth / 10;
  const tenthFrameWidth = frameWidth + tenthExtraWidth;

  // Header de columnas (F1..F10 + Total)
  ctx.fillStyle = theme.textMuted;
  ctx.font = "700 11px Inter, system-ui, -apple-system, sans-serif";
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "center";

  let cursorX = tableX + NAME_COL_WIDTH;
  for (let i = 0; i < standardFrames; i += 1) {
    ctx.fillText(String(i + 1), cursorX + frameWidth / 2, tableY - 12);
    cursorX += frameWidth + FRAME_GAP;
  }
  ctx.fillText("10", cursorX + tenthFrameWidth / 2, tableY - 12);
  cursorX += tenthFrameWidth + FRAME_GAP;
  ctx.fillText("TOTAL", cursorX + TOTAL_COL_WIDTH / 2, tableY - 12);
  ctx.textAlign = "left";

  // Filas de jugadores
  game.players.forEach((player, index) => {
    const rowY = tableY + index * ROW_HEIGHT;
    const isWinner = winnerIds.has(player.id);

    // Fondo de la fila
    if (isWinner) {
      ctx.fillStyle = theme.surfaceWinner;
      roundedRect(ctx, tableX, rowY + 4, tableWidth, ROW_HEIGHT - 8, 14);
      ctx.fill();
    } else {
      ctx.fillStyle = theme.surface;
      roundedRect(ctx, tableX, rowY + 4, tableWidth, ROW_HEIGHT - 8, 14);
      ctx.fill();
    }

    // Borde sutil
    ctx.strokeStyle = isWinner ? theme.amber : theme.border;
    ctx.lineWidth = isWinner ? 1.5 : 1;
    roundedRect(ctx, tableX, rowY + 4, tableWidth, ROW_HEIGHT - 8, 14);
    ctx.stroke();

    // Nombre + corona si gana
    const nameY = rowY + ROW_HEIGHT / 2 + 6;
    if (isWinner) {
      ctx.fillStyle = theme.amber;
      ctx.font = "900 18px serif";
      ctx.textAlign = "left";
      ctx.fillText("♛", tableX + 20, nameY);
    }
    ctx.fillStyle = theme.text;
    ctx.font = "800 22px Inter, system-ui, -apple-system, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(player.name, tableX + (isWinner ? 50 : 24), nameY);

    if (player.summary) {
      ctx.fillStyle = theme.textMuted;
      ctx.font = "500 11px Inter, system-ui, -apple-system, sans-serif";
      ctx.fillText(player.summary, tableX + (isWinner ? 50 : 24), nameY + 18);
    }

    // Frames
    const frameData = frameSymbolsForPlayer(player.rolls);
    let frameX = tableX + NAME_COL_WIDTH;
    for (let i = 0; i < 10; i += 1) {
      const isTenth = i === 9;
      const w = isTenth ? tenthFrameWidth : frameWidth;
      drawFrameCell(ctx, frameX, rowY + 12, w, ROW_HEIGHT - 24, frameData[i], theme);
      frameX += w + FRAME_GAP;
    }

    // Total
    const totalX = frameX;
    const finalScore = (player.adjustedScore ?? player.score);
    ctx.fillStyle = theme.amber;
    ctx.font = "900 30px Inter, system-ui, -apple-system, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(String(finalScore), totalX + TOTAL_COL_WIDTH - 16, rowY + ROW_HEIGHT / 2 + 8);

    if (player.handicap && player.handicap > 0) {
      ctx.fillStyle = theme.emerald;
      ctx.font = "700 10px Inter, system-ui, -apple-system, sans-serif";
      ctx.fillText(
        `${player.score} +${player.handicap}`,
        totalX + TOTAL_COL_WIDTH - 16,
        rowY + ROW_HEIGHT / 2 + 26,
      );
    }
    ctx.textAlign = "left";
  });
}

function drawFrameCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  frame: { symbols: string[]; cumulative: number | null; isStrike: boolean; isSpare: boolean },
  theme: Theme,
) {
  // Fondo interno del frame
  ctx.fillStyle = theme.surfaceMuted;
  roundedRect(ctx, x, y, width, height, 8);
  ctx.fill();

  // Sub-celdas de tiradas
  const slots = frame.symbols.length === 0 ? 2 : Math.max(frame.symbols.length, frame.cumulative != null ? 2 : frame.symbols.length);
  const cellsToShow = width > 90 ? 3 : 2; // frame 10 = 3 slots
  const slotWidth = width / cellsToShow;
  const symbolY = y + 22;

  ctx.font = "900 18px Inter, system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let i = 0; i < cellsToShow; i += 1) {
    const sym = frame.symbols[i] ?? "";
    const cx = x + slotWidth * (i + 0.5);
    if (!sym) {
      ctx.fillStyle = theme.textMuted;
      ctx.fillText("·", cx, symbolY);
      continue;
    }
    if (sym === "X") {
      ctx.fillStyle = theme.amber;
    } else if (sym === "/") {
      ctx.fillStyle = theme.accent;
    } else {
      ctx.fillStyle = theme.text;
    }
    ctx.fillText(sym, cx, symbolY);
  }
  void slots;

  // Score acumulado
  ctx.fillStyle = theme.amber;
  ctx.font = "800 15px Inter, system-ui, -apple-system, sans-serif";
  ctx.textBaseline = "alphabetic";
  if (frame.cumulative != null) {
    ctx.fillText(String(frame.cumulative), x + width / 2, y + height - 10);
  } else {
    ctx.fillStyle = theme.textMuted;
    ctx.fillText("—", x + width / 2, y + height - 10);
  }

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function drawFooter(ctx: CanvasRenderingContext2D, theme: Theme, cardHeight: number) {
  ctx.fillStyle = theme.textMuted;
  ctx.font = "600 13px Inter, system-ui, -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("Bowling Score Calculator · scorecard local", HORIZONTAL_PADDING, cardHeight - 28);

  ctx.fillStyle = theme.textMuted;
  ctx.font = "500 12px Inter, system-ui, -apple-system, sans-serif";
  ctx.textAlign = "right";
  const dateStr = new Intl.DateTimeFormat("es-ES", { dateStyle: "long" }).format(new Date());
  ctx.fillText(`Generado ${dateStr}`, CARD_WIDTH - HORIZONTAL_PADDING, cardHeight - 28);
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = "image/png"): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("No se pudo generar la imagen."));
        return;
      }
      resolve(blob);
    }, type);
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Liberar memoria en el siguiente tick.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Intenta compartir un archivo de imagen vía Web Share API (móviles modernos).
 * Devuelve true si se compartió, false si el navegador no soporta share-files.
 */
export async function shareImageBlob(blob: Blob, filename: string, title?: string): Promise<boolean> {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return false;
  }

  const file = new File([blob], filename, { type: blob.type });

  if ("canShare" in navigator && typeof navigator.canShare === "function") {
    if (!navigator.canShare({ files: [file] })) {
      return false;
    }
  }

  try {
    await navigator.share({
      files: [file],
      title: title ?? "Bowling Score Calculator",
    });
    return true;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      // El usuario canceló — lo tratamos como "sí, se gestionó" para no caer en el fallback.
      return true;
    }
    return false;
  }
}

export function suggestImageFilename(game: SavedGame): string {
  const ranked = rankByMode(game.players, game.mode);
  const top = ranked[0];
  const date = (() => {
    try {
      return new Date(game.date).toISOString().slice(0, 10);
    } catch {
      return "scorecard";
    }
  })();
  const slug = (top?.name ?? "scorecard")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return `bowling-${slug || "scorecard"}-${date}.png`;
}
