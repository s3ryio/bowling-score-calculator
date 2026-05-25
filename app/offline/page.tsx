import { WifiOff } from "lucide-react";
import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="min-h-dvh px-4 py-8 text-white">
      <section className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-xl flex-col justify-center">
        <div className="rounded-lg border border-white/10 bg-white/[0.045] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.34)]">
          <div className="mb-5 grid h-14 w-14 place-items-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 text-cyan-100">
            <WifiOff size={28} />
          </div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-100/60">Modo offline</p>
          <h1 className="mt-2 text-3xl font-black">Bowling Score Calculator sigue disponible.</h1>
          <p className="mt-3 leading-7 text-white/60">
            La app guarda la partida activa e historial en este dispositivo. Cuando vuelva la conexión,
            refresca para recuperar cualquier recurso que no estuviera cacheado.
          </p>
          <Link
            className="mt-6 inline-flex h-12 items-center justify-center rounded-lg bg-cyan-300 px-5 font-black text-black transition hover:bg-cyan-200"
            href="/"
          >
            Volver al marcador
          </Link>
        </div>
      </section>
    </main>
  );
}
