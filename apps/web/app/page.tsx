import { CROSS_VOTE_WEIGHTS, DUEL_LIFECYCLE } from '@trendi/shared';

/**
 * Página de obra. O estádio de verdade é C-06, e depende da camada de vídeo,
 * que está travada em L-03. O que esta página faz por enquanto é provar que
 * o cliente lê as regras de @trendi/shared — nenhuma cópia paralela dos
 * números do duelo, nem aqui nem em lugar nenhum.
 */
export default function Home() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-10 px-6 py-20">
      <header className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold tracking-tight">TRENDI</h1>
        <p className="text-neutral-400">
          Duelos ao vivo entre criadores. Em construção — Fase 1.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-neutral-500">
          Ciclo do duelo
        </h2>
        <ol className="flex flex-wrap gap-2">
          {DUEL_LIFECYCLE.map((state) => (
            <li
              key={state}
              className="rounded-full border border-neutral-800 px-3 py-1 text-sm text-neutral-300"
            >
              {state}
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-neutral-500">
          Peso do voto
        </h2>
        <dl className="grid grid-cols-3 gap-4">
          {[
            ['torcida rival', CROSS_VOTE_WEIGHTS.rival],
            ['geral', CROSS_VOTE_WEIGHTS.general],
            ['própria torcida', CROSS_VOTE_WEIGHTS.own],
          ].map(([label, weight]) => (
            <div key={label} className="rounded-lg border border-neutral-800 p-4">
              <dt className="text-xs text-neutral-500">{label}</dt>
              <dd className="text-2xl font-semibold">
                {(Number(weight) * 100).toFixed(0)}
                <span className="text-base text-neutral-500">%</span>
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-neutral-500">
          Converter quem torce contra vale mais do que agradar quem já torce a favor.
        </p>
      </section>
    </main>
  );
}
