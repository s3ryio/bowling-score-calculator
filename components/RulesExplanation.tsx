import { BadgeCheck, CircleDot, Flame, Gauge, Plus, ShieldCheck } from "lucide-react";

const rules = [
  {
    title: "Strike / pleno",
    icon: Flame,
    text: "Derribas 10 bolos en la primera tirada. El frame vale 10 más las dos tiradas siguientes.",
    example: "X 4 3 = 17",
  },
  {
    title: "Spare / semipleno",
    icon: CircleDot,
    text: "Derribas 10 bolos usando dos tiradas. El frame vale 10 más la siguiente tirada.",
    example: "5 / 5 = 15",
  },
  {
    title: "Décimo frame",
    icon: Plus,
    text: "Si haces spare tienes una bola extra. Si haces strike tienes dos bolas extra.",
    example: "X X X = 30",
  },
  {
    title: "Máximo 300",
    icon: Gauge,
    text: "Doce strikes consecutivos producen una partida perfecta: 300 puntos.",
    example: "12 X",
  },
  {
    title: "Validación",
    icon: ShieldCheck,
    text: "La app desactiva tiradas imposibles y evita extras cuando no corresponden.",
    example: "8 + 3 no se permite",
  },
  {
    title: "Acumulado",
    icon: BadgeCheck,
    text: "Cada frame muestra su puntuación acumulada cuando ya existen las tiradas de bonificación.",
    example: "Frames incompletos quedan en pausa",
  },
];

export function RulesExplanation() {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
      <div className="mb-4">
        <h2 className="text-lg font-black text-white">Cómo se puntúa</h2>
        <p className="text-sm text-white/45">Reglas oficiales, resumidas para jugar sin fricción.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {rules.map((rule) => {
          const Icon = rule.icon;

          return (
            <article className="rounded-lg border border-white/10 bg-black/30 p-3" key={rule.title}>
              <div className="mb-3 flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-emerald-200">
                  <Icon size={17} />
                </span>
                <h3 className="font-black text-white">{rule.title}</h3>
              </div>
              <p className="text-sm leading-6 text-white/55">{rule.text}</p>
              <p className="mt-3 rounded-md bg-white/10 px-2 py-1 text-sm font-bold text-amber-200">{rule.example}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
