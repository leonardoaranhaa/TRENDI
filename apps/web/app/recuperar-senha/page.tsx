'use client';

import Link from 'next/link';
import { useState } from 'react';
import { corpoDoErro, mensagemDoErro } from '../../lib/mensagens';
import { Aviso, Botao, Campo, Erro } from '../componentes/campos';
import { MarcaLink } from '../componentes/marca';

export default function RecuperarSenha() {
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function pedir(event: React.FormEvent) {
    event.preventDefault();
    setEnviando(true);
    setErro(null);

    const response = await fetch('/api/auth/password/forgot', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (response.ok) {
      const corpo = (await response.json()) as { link?: string };
      setEnviado(true);
      // Em desenvolvimento a API devolve o link, porque ainda não há provedor
      // de e-mail contratado (L-18). Em produção isso não vem.
      setLink(corpo.link ?? null);
    } else {
      setErro(
        response.status === 429
          ? 'Muitos pedidos seguidos. Espera um pouco.'
          : mensagemDoErro(await corpoDoErro(response)),
      );
    }

    setEnviando(false);
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-8 px-6 py-24">
      <MarcaLink />

      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Esqueci a senha</h1>
        <p className="text-tinta-fraca">A gente manda um link para você escolher outra.</p>
      </header>

      {enviado ? (
        <div className="flex flex-col gap-4">
          <Aviso>
            Se existir conta com esse e-mail, o link já está a caminho. O link vale por uma hora.
          </Aviso>
          {link !== null && (
            <Aviso>
              Ambiente de desenvolvimento, sem provedor de e-mail (L-18). O link é este:{' '}
              <a className="underline underline-offset-4" href={link}>
                redefinir senha
              </a>
            </Aviso>
          )}
        </div>
      ) : (
        <form onSubmit={pedir} className="flex flex-col gap-4">
          <Campo
            rotulo="E-mail"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
          <Erro>{erro}</Erro>
          <Botao type="submit" disabled={enviando}>
            {enviando ? 'Enviando…' : 'Enviar link'}
          </Botao>
        </form>
      )}

      <Link href="/entrar" className="text-sm text-tinta-fraca underline underline-offset-4">
        Voltar para entrar
      </Link>
    </main>
  );
}
