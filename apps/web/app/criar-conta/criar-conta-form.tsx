'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { corpoDoErro, mensagemDoErro } from '../../lib/mensagens';
import { Botao, Campo, Erro } from '../componentes/campos';

/** Criar conta na TRENDI, sem depender de plataforma nenhuma (decisão D-19). */
export function CriarContaForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [handle, setHandle] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function criar(event: React.FormEvent) {
    event.preventDefault();
    setEnviando(true);
    setErro(null);

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password: senha, handle: handle || undefined }),
    });

    if (response.ok) {
      router.push('/perfil?novo=1');
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
    <form onSubmit={criar} className="flex flex-col gap-4">
      <Campo
        rotulo="E-mail"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        autoComplete="email"
        required
      />
      <Campo
        rotulo="Senha (mínimo de 10 caracteres)"
        type="password"
        value={senha}
        onChange={(event) => setSenha(event.target.value)}
        autoComplete="new-password"
        minLength={10}
        required
      />
      <Campo
        rotulo="Seu nome na arquibancada (opcional)"
        value={handle}
        onChange={(event) => setHandle(event.target.value.toLowerCase())}
        placeholder="deixa em branco que a gente escolhe"
        maxLength={20}
      />

      <Erro>{erro}</Erro>

      <Botao type="submit" disabled={enviando}>
        {enviando ? 'Criando…' : 'Criar conta'}
      </Botao>

      <p className="text-sm text-neutral-500">
        Já tem conta?{' '}
        <Link href="/entrar" className="underline underline-offset-4 hover:text-neutral-300">
          Entrar
        </Link>
      </p>
    </form>
  );
}
