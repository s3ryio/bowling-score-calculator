import { describe, expect, test } from "vitest";

import {
  createPwaCacheNames,
  getDisplayMode,
  shouldHandleServiceWorkerRequest,
  shouldShowIosInstallHint,
} from "@/lib/pwa";

describe("pwa helpers", () => {
  test("creates versioned cache names", () => {
    expect(createPwaCacheNames("v4")).toEqual({
      preCache: "bowling-score-calculator-precache-v4",
      runtime: "bowling-score-calculator-runtime-v4",
      images: "bowling-score-calculator-images-v4",
    });
  });

  test("detects standalone display mode", () => {
    expect(getDisplayMode({ isStandalone: true, matchesStandaloneMedia: false })).toBe("standalone");
    expect(getDisplayMode({ isStandalone: false, matchesStandaloneMedia: true })).toBe("standalone");
    expect(getDisplayMode({ isStandalone: false, matchesStandaloneMedia: false })).toBe("browser");
  });

  test("shows iOS install hint only in Safari browser mode", () => {
    const safari =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
    const chrome =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0 Mobile/15E148 Safari/604.1";

    expect(shouldShowIosInstallHint(safari, false)).toBe(true);
    expect(shouldShowIosInstallHint(safari, true)).toBe(false);
    expect(shouldShowIosInstallHint(chrome, false)).toBe(false);
  });

  test("handles only same-origin GET requests in the service worker", () => {
    expect(shouldHandleServiceWorkerRequest("GET", "https://app.example/history", "https://app.example")).toBe(true);
    expect(shouldHandleServiceWorkerRequest("POST", "https://app.example/history", "https://app.example")).toBe(false);
    expect(shouldHandleServiceWorkerRequest("GET", "https://cdn.example/app.js", "https://app.example")).toBe(false);
  });
});
