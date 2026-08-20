'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { corpoDoErro, mensagemDoErro } from '../../lib/mensagens';
import { Aviso, Botao, Campo, Erro } from '../componentes/campos';

function Formulario() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';
  const [senha, setSenha] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [pronto, setPronto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function redefinir(event: React.FormEvent) {
    event.preventDefault();
    setEnviando(true);
    setErro(null);

    const response = await fetch('/api/auth/password/reset', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, password: senha }),
    });

    if (response.ok) {
      setPronto(true);
      setEnviando(false);
      return;
    }

    setErro(mensagemDoErro(await corpoDoErro(response)));
    setEnviando(false);
  }

  if (token === '') {
    return <Aviso>Link incompleto. Peça outro em &quot;esqueci a senha&quot;.</Aviso>;
  }

  if (pronto) {
    return (
      <div className="flex flex-col gap-4">
        <Aviso>
          Senha trocada. Por segurança, as sessões abertas em outros aparelhos foram encerradas.
        </Aviso>
        <Botao type="button" onClick={() => router.push('/entrar')}>
          Entrar com a senha nova
        </Botao>
      </div>
    );
  }

  return (
    <form onSubmit={redefinir} className="flex flex-col gap-4">
      <Campo
        rotulo="Nova senha (mínimo de 10 caracteres)"
        type="password"
        value={senha}
        onChange={(event) => setSenha(event.target.value)}
        autoComplete="new-password"
        minLength={10}
        required
      />
      <Erro>{erro}</Erro>
      <Botao type="submit" disabled={enviando}>
        {enviando ? 'Trocando…' : 'Trocar senha'}
      </Botao>
    </form>
  );
}

export default function RedefinirSenha() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-8 px-6 py-24">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Nova senha</h1>
        <p className="text-neutral-400">Escolha uma que você lembre e ninguém adivinhe.</p>
      </header>

      <Suspense fallback={<Aviso>Carregando…</Aviso>}>
        <Formulario />
      </Suspense>

      <Link href="/entrar" className="text-sm text-neutral-500 underline underline-offset-4">
        Voltar para entrar
      </Link>
    </main>
  );
}
