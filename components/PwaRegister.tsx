"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, RefreshCw, Share, WifiOff, X } from "lucide-react";

import { getDisplayMode, shouldShowIosInstallHint } from "@/lib/pwa";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

type NavigatorWithStandalone = Navigator & { standalone?: boolean };

function noopSubscribe() {
  return () => {};
}

function getNavigatorStandalone(): boolean {
  return typeof window !== "undefined" && Boolean((window.navigator as NavigatorWithStandalone).standalone);
}

function getBrowserDisplayMode() {
  if (typeof window === "undefined") {
    return "browser";
  }

  return getDisplayMode({
    isStandalone: getNavigatorStandalone(),
    matchesStandaloneMedia: window.matchMedia("(display-mode: standalone)").matches,
  });
}

function getIosInstallHintSnapshot(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return shouldShowIosInstallHint(window.navigator.userAgent, getBrowserDisplayMode() === "standalone");
}

function subscribeOnline(onStoreChange: () => void) {
  window.addEventListener("online", onStoreChange);
  window.addEventListener("offline", onStoreChange);

  return () => {
    window.removeEventListener("online", onStoreChange);
    window.removeEventListener("offline", onStoreChange);
  };
}

function getOnlineSnapshot(): boolean {
  return typeof window === "undefined" ? true : window.navigator.onLine;
}

export function PwaRegister() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [updateWorker, setUpdateWorker] = useState<ServiceWorker | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const isOnline = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, () => true);
  const displayMode = useSyncExternalStore(noopSubscribe, getBrowserDisplayMode, () => "browser");
  const showIosHint = useSyncExternalStore(noopSubscribe, getIosInstallHintSnapshot, () => false);
  const showInstallHint = !dismissed && displayMode !== "standalone" && (Boolean(installPrompt) || showIosHint);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      setInstallPrompt(null);
      setDismissed(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister();
        });
      });

      if ("caches" in window) {
        window.caches.keys().then((keys) => {
          keys
            .filter((key) => key.startsWith("bowling-score-calculator"))
            .forEach((key) => {
              window.caches.delete(key);
            });
        });
      }

      return;
    }

    let refreshing = false;

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) {
        return;
      }

      refreshing = true;
      window.location.reload();
    });

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        if (registration.waiting && navigator.serviceWorker.controller) {
          setUpdateWorker(registration.waiting);
        }

        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;

          if (!worker) {
            return;
          }

          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              setUpdateWorker(worker);
            }
          });
        });
      })
      .catch(() => {
        // A failed service worker should never block scoring.
      });
  }, []);

  async function installApp() {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;

    if (choice.outcome === "accepted" || choice.outcome === "dismissed") {
      setInstallPrompt(null);
      setDismissed(true);
    }
  }

  function refreshApp() {
    updateWorker?.postMessage({ type: "SKIP_WAITING" });
  }

  if (dismissed || displayMode === "standalone") {
    return !isOnline ? <OfflineBanner /> : null;
  }

  return (
    <>
      {!isOnline && <OfflineBanner />}

      {updateWorker && (
        <div className="fixed inset-x-4 top-4 z-[60] mx-auto max-w-md rounded-lg border border-amber-200/35 bg-slate-950/95 p-4 text-white shadow-[0_22px_80px_rgba(251,191,36,0.22)] backdrop-blur-xl">
          <p className="text-sm font-black text-amber-100">Nueva versión lista</p>
          <p className="mt-1 text-sm text-white/55">Actualiza para usar la última versión offline.</p>
          <button
            className="mt-3 inline-flex h-10 items-center gap-2 rounded-lg bg-amber-200 px-4 text-sm font-black text-black"
            onClick={refreshApp}
            type="button"
          >
            <RefreshCw size={16} />
            Actualizar
          </button>
        </div>
      )}

      {showInstallHint && (
        <div className="fixed bottom-20 left-4 right-4 z-[55] mx-auto max-w-md rounded-lg border border-cyan-300/25 bg-slate-950/95 p-4 text-white shadow-[0_22px_80px_rgba(34,211,238,0.18)] backdrop-blur-xl lg:bottom-5 lg:right-auto">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black text-cyan-100">Instalar app</p>
              <p className="mt-1 text-sm leading-6 text-white/55">
                Añade Bowling Score a la pantalla de inicio para abrirlo como app y usarlo offline.
              </p>
            </div>
            <button
              aria-label="Ocultar instalación"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.06] text-white/60"
              onClick={() => {
                setDismissed(true);
              }}
              type="button"
            >
              <X size={16} />
            </button>
          </div>

          {installPrompt ? (
            <button
              className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-cyan-300 px-4 font-black text-black transition hover:bg-cyan-200"
              onClick={installApp}
              type="button"
            >
              <Download size={18} />
              Añadir a pantalla de inicio
            </button>
          ) : (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] p-3 text-sm text-white/65">
              <Share size={18} className="text-cyan-100" />
              En iPhone: Compartir y después “Añadir a pantalla de inicio”.
            </div>
          )}
        </div>
      )}
    </>
  );
}

function OfflineBanner() {
  return (
    <div className="fixed inset-x-4 top-4 z-[65] mx-auto flex max-w-sm items-center justify-center gap-2 rounded-lg border border-white/10 bg-slate-950/95 px-4 py-3 text-sm font-black text-white shadow-[0_18px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <WifiOff size={17} className="text-cyan-100" />
      Modo offline activo
    </div>
  );
}
