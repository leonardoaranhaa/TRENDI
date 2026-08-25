'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { SessionUser } from '../../lib/api';

const PROBLEMAS: Record<string, string> = {
  muito_curto: 'Curto demais: mínimo de 3 caracteres.',
  muito_longo: 'Longo demais: máximo de 20 caracteres.',
  caracteres_invalidos: 'Use só letras minúsculas, números e _.',
  reservado: 'Esse nome é reservado pela plataforma.',
  handle_em_uso: 'Alguém já está usando esse nome.',
};

export function PerfilForm({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [handle, setHandle] = useState(user.handle);
  const [displayName, setDisplayName] = useState(user.displayName ?? '');
  const [status, setStatus] = useState<'parado' | 'salvando' | 'salvo'>('parado');
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(event: React.FormEvent) {
    event.preventDefault();
    setStatus('salvando');
    setErro(null);

    const response = await fetch('/api/me', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ handle, displayName }),
    });

    if (response.ok) {
      setStatus('salvo');
      router.refresh();
      return;
    }

    const corpo = (await response.json()) as { error?: string; problema?: string };
    setErro(PROBLEMAS[corpo.problema ?? corpo.error ?? ''] ?? 'Não deu para salvar agora.');
    setStatus('parado');
  }

  async function sair() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    router.push('/');
    router.refresh();
  }

  return (
    <form onSubmit={salvar} className="flex flex-col gap-6">
      <label className="flex flex-col gap-2">
        <span className="text-sm text-tinta-fraca">Seu nome na arquibancada</span>
        <div className="flex items-center gap-2 rounded-lg border border-traco px-3 py-2">
          <span className="text-tinta-fraca">@</span>
          <input
            value={handle}
            onChange={(event) => setHandle(event.target.value.toLowerCase())}
            className="w-full bg-transparent outline-none"
            maxLength={20}
            required
          />
        </div>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm text-tinta-fraca">Nome que aparece na tela</span>
        <input
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          className="rounded-lg border border-traco bg-transparent px-3 py-2 outline-none"
          maxLength={60}
        />
      </label>

      {erro !== null && <p className="text-sm text-red-300">{erro}</p>}
      {status === 'salvo' && erro === null && <p className="text-sm text-green-300">Salvo.</p>}

      <div className="flex items-center justify-between gap-4">
        <button
          type="submit"
          disabled={status === 'salvando'}
          className="rounded-lg bg-azul px-4 py-2 font-medium text-branco transition hover:bg-white disabled:opacity-50"
        >
          {status === 'salvando' ? 'Salvando…' : 'Salvar'}
        </button>

        <button
          type="button"
          onClick={sair}
          className="text-sm text-tinta-fraca underline underline-offset-4 hover:text-branco"
        >
          Sair
        </button>
      </div>
    </form>
  );
}
