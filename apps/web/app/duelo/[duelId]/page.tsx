import Link from 'next/link';
import { getDuel, getSessionUser } from '../../../lib/api';
import { Aviso } from '../../componentes/campos';
import { EstadioCliente } from './estadio-cliente';

export const dynamic = 'force-dynamic';

/**
 * O estádio (C-06).
 *
 * Assistir não pede conta. Quem chega por um link ou por um clipe vê o duelo
 * inteiro; a conta só entra em cena na hora de falar e de votar. Por isso
 * esta página não redireciona para o login — nunca.
 */
export default async function Estadio({ params }: { params: Promise<{ duelId: string }> }) {
  const { duelId } = await params;
  const [user, dados] = await Promise.all([getSessionUser(), getDuel(duelId)]);

  const moldura = (conteudo: React.ReactNode) => (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-12">{conteudo}</main>
  );

  if (dados === null) {
    return moldura(
      <>
        <h1 className="text-3xl font-bold tracking-tight">Duelo</h1>
        <Aviso>Esse duelo não existe, ou já saiu do ar.</Aviso>
        <Link href="/" className="text-sm text-tinta-fraca underline underline-offset-4">
          Voltar
        </Link>
      </>,
    );
  }

  return moldura(
    <EstadioCliente
      duelId={duelId}
      inicial={dados}
      eu={user === null ? null : { id: user.id, handle: user.handle }}
    />,
  );
}
