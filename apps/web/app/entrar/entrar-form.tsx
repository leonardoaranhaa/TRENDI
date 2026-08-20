'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { corpoDoErro, mensagemDoErro } from '../../lib/mensagens';
import { Botao, Campo, Erro } from '../componentes/campos';

/** Entrar com e-mail e senha — a porta da frente (decisão D-19). */
export function EntrarForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function entrar(event: React.FormEvent) {
    event.preventDefault();
    setEnviando(true);
    setErro(null);

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password: senha }),
    });

    if (response.ok) {
      router.push('/perfil');
      router.refresh();
      return;
    }

    setErro(
      response.status === 429
        ? 'Muitas tentativas seguidas. Espera um pouco.'
        : mensagemDoErro(await corpoDoErro(response)),
    );
    setEnviando(false);
  }

  return (
    <form onSubmit={entrar} className="flex flex-col gap-4">
      <Campo
        rotulo="E-mail"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        autoComplete="email"
        required
      />
      <Campo
        rotulo="Senha"
        type="password"
        value={senha}
        onChange={(event) => setSenha(event.target.value)}
        autoComplete="current-password"
        required
      />

      <Erro>{erro}</Erro>

      <Botao type="submit" disabled={enviando}>
        {enviando ? 'Entrando…' : 'Entrar'}
      </Botao>

      <div className="flex justify-between text-sm text-neutral-500">
        <Link href="/criar-conta" className="underline underline-offset-4 hover:text-neutral-300">
          Criar conta
        </Link>
        <Link
          href="/recuperar-senha"
          className="underline underline-offset-4 hover:text-neutral-300"
        >
          Esqueci a senha
        </Link>
      </div>
    </form>
  );
}
