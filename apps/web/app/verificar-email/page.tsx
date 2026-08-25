'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { corpoDoErro, mensagemDoErro } from '../../lib/mensagens';
import { Aviso, Erro } from '../componentes/campos';

function Verificacao() {
  const token = useSearchParams().get('token') ?? '';
  const [estado, setEstado] = useState<'verificando' | 'ok' | 'erro'>('verificando');
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (token === '') {
      setEstado('erro');
      setErro('Link incompleto.');
      return;
    }

    let cancelado = false;

    void (async () => {
      const response = await fetch('/api/auth/email/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token }),
      });
      if (cancelado) return;

      if (response.ok) {
        setEstado('ok');
        return;
      }
      setErro(mensagemDoErro(await corpoDoErro(response)));
      setEstado('erro');
    })();

    return () => {
      cancelado = true;
    };
  }, [token]);

  if (estado === 'verificando') return <Aviso>Verificando…</Aviso>;
  if (estado === 'ok') {
    return (
      <Aviso>
        E-mail verificado. Agora dá para ligar sua conta ao Google ou ao Discord com segurança.
      </Aviso>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Erro>{erro}</Erro>
      <Aviso>Peça outro link no seu perfil.</Aviso>
    </div>
  );
}

export default function VerificarEmail() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-8 px-6 py-24">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Verificar e-mail</h1>
      </header>

      <Suspense fallback={<Aviso>Carregando…</Aviso>}>
        <Verificacao />
      </Suspense>

      <Link href="/perfil" className="text-sm text-tinta-fraca underline underline-offset-4">
        Ir para o perfil
      </Link>
    </main>
  );
}
