import { redirect } from 'next/navigation';
import { getSessionUser } from '../../lib/api';
import { CriarContaForm } from './criar-conta-form';

export const dynamic = 'force-dynamic';

export default async function CriarConta() {
  if ((await getSessionUser()) !== null) redirect('/perfil');

  return (
    <main className="mx-auto flex max-w-md flex-col gap-8 px-6 py-24">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Criar conta</h1>
        <p className="text-neutral-400">
          Conta da TRENDI mesmo — sem precisar de Google, Discord ou de conta em lugar nenhum.
        </p>
      </header>

      <CriarContaForm />
    </main>
  );
}
