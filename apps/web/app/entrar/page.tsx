import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PROVIDER_LABELS, getProviders, getSessionUser } from '../../lib/api';
import { EntrarForm } from './entrar-form';
import { MarcaLink } from '../componentes/marca';

export const dynamic = 'force-dynamic';

export default async function Entrar({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const [user, providers, params] = await Promise.all([
    getSessionUser(),
    getProviders(),
    searchParams,
  ]);
  if (user !== null) redirect('/perfil');

  return (
    <main className="mx-auto flex max-w-md flex-col gap-8 px-6 py-24">
      <MarcaLink />

      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Entrar na TRENDI</h1>
        <p className="text-tinta-fraca">
          Com conta da TRENDI, ou pelo atalho de quem já tem Google ou Discord.
        </p>
      </header>

      {params.erro !== undefined && (
        <p className="rounded-lg border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-200">
          O login não foi concluído ({params.erro}). Dá para tentar de novo.
        </p>
      )}

      <EntrarForm />

      {providers.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-tinta-fraca">
            <span className="h-px flex-1 bg-traco" />
            ou
            <span className="h-px flex-1 bg-traco" />
          </div>

          <ul className="flex flex-col gap-3">
            {providers.map((provider) => (
              <li key={provider}>
                <a
                  href={`/api/auth/${provider}/start`}
                  className="block rounded-lg border border-traco-aceso px-4 py-3 text-center font-medium transition hover:border-azul hover:bg-noite"
                >
                  {PROVIDER_LABELS[provider] ?? `Entrar com ${provider}`}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Link href="/" className="text-sm text-tinta-fraca underline underline-offset-4">
        Voltar
      </Link>
    </main>
  );
}
