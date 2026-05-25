export type DisplayMode = "standalone" | "browser";

export interface PwaCacheNames {
  preCache: string;
  runtime: string;
  images: string;
}

interface DisplayModeInput {
  isStandalone: boolean;
  matchesStandaloneMedia: boolean;
}

export function createPwaCacheNames(version: string): PwaCacheNames {
  const prefix = "bowling-score-calculator";

  return {
    preCache: `${prefix}-precache-${version}`,
    runtime: `${prefix}-runtime-${version}`,
    images: `${prefix}-images-${version}`,
  };
}

export function getDisplayMode(input: DisplayModeInput): DisplayMode {
  return input.isStandalone || input.matchesStandaloneMedia ? "standalone" : "browser";
}

export function shouldShowIosInstallHint(userAgent: string, isStandalone: boolean): boolean {
  const isIos = /iphone|ipad|ipod/i.test(userAgent);
  const isSafari = /safari/i.test(userAgent) && !/crios|fxios|edgios/i.test(userAgent);

  return isIos && isSafari && !isStandalone;
}

export function shouldHandleServiceWorkerRequest(method: string, url: string, origin: string): boolean {
  if (method !== "GET") {
    return false;
  }

  try {
    return new URL(url).origin === origin;
  } catch {
    return false;
  }
}
