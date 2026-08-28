import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getDuel, getSessionUser, ladoDoCompetidor, podePublicar } from '../../../../lib/api';
import { Aviso } from '../../../componentes/campos';
import { PublicarCliente } from './publicar-cliente';

export const dynamic = 'force-dynamic';

export default async function Publicar({ params }: { params: Promise<{ duelId: string }> }) {
  const { duelId } = await params;
  const [user, dados] = await Promise.all([getSessionUser(), getDuel(duelId)]);

  if (user === null) redirect(`/entrar?voltar=${encodeURIComponent(`/duelo/${duelId}/publicar`)}`);

  const moldura = (conteudo: React.ReactNode) => (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Sua câmera</h1>
        <p className="text-tinta-fraca">
          A captação é direto do navegador. Nada para instalar — nunca vai ter.
        </p>
      </header>
      {conteudo}
      <Link href="/" className="text-sm text-tinta-fraca underline underline-offset-4">
        Voltar
      </Link>
    </main>
  );

  if (dados === null) return moldura(<Aviso>Esse duelo não existe, ou já saiu do ar.</Aviso>);
  const { duel } = dados;

  // Só os dois competidores publicam. A plateia assiste no estádio (C-06).
  const side = ladoDoCompetidor(duel, user.id);
  if (side === null) {
    return moldura(<Aviso>Você não é competidor deste duelo. A arquibancada é logo ali.</Aviso>);
  }

  if (!podePublicar(duel)) {
    return moldura(
      <Aviso>
        A câmera abre quando o duelo é aceito e fecha no fim da execução. Agora ele está em{' '}
        <span className="font-mono">{duel.state}</span>.
      </Aviso>,
    );
  }

  // Quem vai executar precisa ler o desafio antes de ligar a câmera — e o
  // tempo, que é o que define a dificuldade.
  return moldura(
    <>
      {dados.challenge !== null && (
        <div className="flex flex-col gap-1 rounded-xl border border-traco bg-noite px-4 py-3">
          <div className="flex items-baseline gap-3">
            <span className="voz-da-marca text-[0.6rem] text-eletrico">Seu desafio</span>
            <span className="text-base font-semibold">{dados.challenge.name}</span>
            {dados.challenge.durationS !== null && (
              <span className="voz-da-marca text-[0.6rem] text-tinta-fraca">
                {dados.challenge.durationS}s
              </span>
            )}
          </div>
          <p className="text-sm text-tinta-fraca">{dados.challenge.rules}</p>
        </div>
      )}
      <PublicarCliente duelId={duelId} side={side} estadoInicial={duel.state} />
    </>,
  );
}
