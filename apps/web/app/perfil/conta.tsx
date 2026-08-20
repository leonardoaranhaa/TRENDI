'use client';

import { useState } from 'react';
import type { SessionUser } from '../../lib/api';
import { corpoDoErro, mensagemDoErro } from '../../lib/mensagens';
import { Aviso, Botao, Campo, Erro } from '../componentes/campos';

/**
 * A parte de segurança do perfil: verificar e-mail e ter uma senha própria.
 *
 * Quem entrou por Google ou Discord pode criar senha aqui e deixar de
 * depender do provedor para entrar — é o outro lado da decisão D-19.
 */
export function Conta({ user }: { user: SessionUser }) {
  return (
    <section className="flex flex-col gap-6 border-t border-neutral-900 pt-8">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-neutral-500">Conta</h2>

      {user.email !== null && <VerificacaoDeEmail verificado={user.emailVerified} />}
      {!user.hasPassword && <CriarSenha />}
    </section>
  );
}

function VerificacaoDeEmail({ verificado }: { verificado: boolean }) {
  const [estado, setEstado] = useState<'parado' | 'enviando' | 'enviado'>('parado');
  const [link, setLink] = useState<string | null>(null);

  if (verificado) return <Aviso>E-mail verificado.</Aviso>;

  async function reenviar() {
    setEstado('enviando');
    const response = await fetch('/api/auth/email/resend', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: '{}',
    });
    const corpo = response.ok ? ((await response.json()) as { link?: string }) : {};
    setLink(corpo.link ?? null);
    setEstado('enviado');
  }

  return (
    <div className="flex flex-col gap-3">
      <Aviso>
        Seu e-mail ainda não foi verificado. Verificar é o que permite ligar esta conta ao Google
        ou ao Discord com segurança.
      </Aviso>

      {estado === 'enviado' ? (
        <Aviso>
          Link enviado.{' '}
          {link !== null && (
            <>
              Sem provedor de e-mail por aqui (L-18), então segue direto:{' '}
              <a className="underline underline-offset-4" href={link}>
                verificar agora
              </a>
            </>
          )}
        </Aviso>
      ) : (
        <Botao type="button" onClick={reenviar} disabled={estado === 'enviando'}>
          {estado === 'enviando' ? 'Enviando…' : 'Reenviar verificação'}
        </Botao>
      )}
    </div>
  );
}

function CriarSenha() {
  const [senha, setSenha] = useState('');
  const [estado, setEstado] = useState<'parado' | 'salvando' | 'pronto'>('parado');
  const [erro, setErro] = useState<string | null>(null);

  async function criar(event: React.FormEvent) {
    event.preventDefault();
    setEstado('salvando');
    setErro(null);

    const response = await fetch('/api/auth/password/set', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ password: senha }),
    });

    if (response.ok) {
      setEstado('pronto');
      return;
    }

    setErro(mensagemDoErro(await corpoDoErro(response)));
    setEstado('parado');
  }

  if (estado === 'pronto') {
    return <Aviso>Senha criada. Agora dá para entrar sem o provedor também.</Aviso>;
  }

  return (
    <form onSubmit={criar} className="flex flex-col gap-3">
      <Aviso>
        Você entrou por um provedor externo. Criar uma senha deixa você entrar mesmo que aquele
        atalho saia do ar.
      </Aviso>
      <Campo
        rotulo="Criar senha (mínimo de 10 caracteres)"
        type="password"
        value={senha}
        onChange={(event) => setSenha(event.target.value)}
        autoComplete="new-password"
        minLength={10}
        required
      />
      <Erro>{erro}</Erro>
      <Botao type="submit" disabled={estado === 'salvando'}>
        {estado === 'salvando' ? 'Criando…' : 'Criar senha'}
      </Botao>
    </form>
  );
}
