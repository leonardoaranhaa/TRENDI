import { redirect } from 'next/navigation';
import { getSessionUser } from '../../lib/api';
import { PerfilForm } from './perfil-form';

export const dynamic = 'force-dynamic';

export default async function Perfil({
  searchParams,
}: {
  searchParams: Promise<{ novo?: string }>;
}) {
  const [user, params] = await Promise.all([getSessionUser(), searchParams]);
  if (user === null) redirect('/entrar');

  return (
    <main className="mx-auto flex max-w-md flex-col gap-8 px-6 py-24">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">
          {params.novo === '1' ? 'Bem-vindo à TRENDI' : 'Seu perfil'}
        </h1>
        <p className="text-neutral-400">
          {params.novo === '1'
            ? 'Escolhemos um nome para você começar. Troque se quiser — é ele que aparece na arquibancada.'
            : 'É assim que você aparece nos duelos.'}
        </p>
      </header>

      <PerfilForm user={user} />
    </main>
  );
}
