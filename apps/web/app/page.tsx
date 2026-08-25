import Link from 'next/link';
import { CROSS_VOTE_WEIGHTS, DUEL_LIFECYCLE } from '@trendi/shared';
import { Assinatura, Marca } from './componentes/marca';

/**
 * Página de obra. O estádio de verdade é C-06, e depende da camada de vídeo,
 * que está travada em L-03. O que esta página faz por enquanto é provar que
 * o cliente lê as regras de @trendi/shared — nenhuma cópia paralela dos
 * números do duelo, nem aqui nem em lugar nenhum.
 */
export default function Home() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-10 px-6 py-20">
      <header className="flex flex-col items-start gap-5">
        <h1 className="sr-only">TRENDI</h1>
        <Marca altura={72} />
        <Assinatura />
        <p className="text-tinta-fraca">
          Duelos ao vivo entre criadores. Em construção — Fase 1.
        </p>
        <Link
          href="/entrar"
          className="w-fit rounded-lg bg-azul px-5 py-2.5 text-sm font-semibold transition hover:shadow-brilho-forte"
        >
          Entrar
        </Link>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="voz-da-marca text-xs text-eletrico">
          Ciclo do duelo
        </h2>
        <ol className="flex flex-wrap gap-2">
          {DUEL_LIFECYCLE.map((state) => (
            <li
              key={state}
              className="rounded-full border border-traco bg-noite px-3 py-1 text-sm text-tinta-fraca"
            >
              {state}
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="voz-da-marca text-xs text-eletrico">
          Peso do voto
        </h2>
        <dl className="grid grid-cols-3 gap-4">
          {[
            ['torcida rival', CROSS_VOTE_WEIGHTS.rival],
            ['geral', CROSS_VOTE_WEIGHTS.general],
            ['própria torcida', CROSS_VOTE_WEIGHTS.own],
          ].map(([label, weight]) => (
            <div key={label} className="rounded-xl border border-traco bg-noite p-4">
              <dt className="text-xs text-tinta-fraca">{label}</dt>
              <dd className="text-2xl font-semibold">
                {(Number(weight) * 100).toFixed(0)}
                <span className="text-base text-tinta-fraca">%</span>
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-tinta-fraca">
          Converter quem torce contra vale mais do que agradar quem já torce a favor.
        </p>
      </section>
    </main>
  );
}
