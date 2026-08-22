'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
  MENSAGEM_DE_ERRO,
  PUBLICACAO_INICIAL,
  estaNoAr,
  motivoDoErro,
  podeCortar,
  reduzir,
} from '../../../../lib/publicacao';
import { Aviso, Botao, Erro } from '../../../componentes/campos';

/**
 * A tela de quem duela (C-04).
 *
 * Captação por `getUserMedia` e envio por WebRTC — sem instalar nada, que é o
 * princípio nº 4 do projeto.
 *
 * Sem credencial da AWS (estado normal até `L-19`), a tela roda em **modo
 * local**: a câmera liga, a prévia funciona, e a tela diz na cara que nada
 * está saindo daqui. É o que permite ensaiar o duelo inteiro sem conta.
 */

interface Props {
  readonly duelId: string;
  readonly side: 'a' | 'b';
  readonly estadoInicial: string;
}

const LADO = { a: 'lado A', b: 'lado B' } as const;

export function PublicarCliente({ duelId, side, estadoInicial }: Props) {
  const [publicacao, despachar] = useReducer(reduzir, PUBLICACAO_INICIAL);
  const [estadoDoDuelo, setEstadoDoDuelo] = useState(estadoInicial);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  /** Liga a câmera e mostra a prévia. */
  const ligarCamera = useCallback(async () => {
    despachar({ tipo: 'pedir_permissao' });

    if (typeof navigator === 'undefined' || navigator.mediaDevices === undefined) {
      // Sem `mediaDevices` o navegador está em conexão insegura — ou é antigo
      // demais para o produto existir nele.
      despachar({ tipo: 'falhou', motivo: 'contexto_inseguro' });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });

      streamRef.current = stream;
      if (videoRef.current !== null) videoRef.current.srcObject = stream;

      despachar({
        tipo: 'permissao_concedida',
        comVideo: stream.getVideoTracks().length > 0,
        comAudio: stream.getAudioTracks().length > 0,
      });
    } catch (erro) {
      despachar({ tipo: 'falhou', motivo: motivoDoErro(erro) });
    }
  }, []);

  /** Entra no duelo: pede a credencial e publica. */
  const entrarNoAr = useCallback(async () => {
    const resposta = await fetch(`/api/duels/${duelId}/publish-credential`, {
      method: 'POST',
      credentials: 'include',
    });

    // 503 é o ambiente sem fornecedor de vídeo — ainda esperando L-19. A
    // prévia continua valendo, e a tela avisa que ninguém está vendo.
    if (resposta.status === 503) {
      despachar({ tipo: 'publicar', modoLocal: true });
      return;
    }
    if (!resposta.ok) {
      despachar({ tipo: 'falhou', motivo: 'falha_ao_publicar' });
      return;
    }

    try {
      const { credential } = (await resposta.json()) as {
        credential: { token: string };
      };
      const { publicar } = await import('../../../../lib/ivs-cliente');
      await publicar(credential.token, streamRef.current);
      despachar({ tipo: 'publicar', modoLocal: false });
    } catch {
      despachar({ tipo: 'falhou', motivo: 'falha_ao_publicar' });
    }
  }, [duelId]);

  function alternarVideo() {
    const trilha = streamRef.current?.getVideoTracks()[0];
    if (trilha === undefined) return;
    trilha.enabled = !trilha.enabled;
    despachar({ tipo: 'cortar_video', cortado: !trilha.enabled });
  }

  function alternarAudio() {
    const trilha = streamRef.current?.getAudioTracks()[0];
    if (trilha === undefined) return;
    trilha.enabled = !trilha.enabled;
    despachar({ tipo: 'cortar_audio', cortado: !trilha.enabled });
  }

  // A câmera precisa desligar quando a pessoa sai da tela: luz de câmera acesa
  // sem duelo acontecendo é assustador, e com razão.
  useEffect(() => {
    return () => {
      for (const trilha of streamRef.current?.getTracks() ?? []) trilha.stop();
      streamRef.current = null;
    };
  }, []);

  // Enquanto o estádio (C-06) não existe, o estado vem de pergunta em
  // pergunta. Quando ele chegar, já haverá WebSocket aberto e isto sai.
  useEffect(() => {
    const relogio = setInterval(() => {
      void fetch(`/api/duels/${duelId}`, { credentials: 'include' })
        .then((r) => (r.ok ? r.json() : null))
        .then((corpo: { duel?: { state?: string } } | null) => {
          if (corpo?.duel?.state !== undefined) setEstadoDoDuelo(corpo.duel.state);
        })
        .catch(() => undefined);
    }, 5000);

    return () => clearInterval(relogio);
  }, [duelId]);

  return (
    <div className="flex flex-col gap-6">
      <div className="relative overflow-hidden rounded-xl border border-neutral-800 bg-black">
        <video
          ref={videoRef}
          data-testid="previa"
          autoPlay
          muted
          playsInline
          className="aspect-video w-full scale-x-[-1] object-cover"
        />

        {publicacao.estado === 'ocioso' && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-neutral-500">
            Câmera desligada
          </div>
        )}

        {estaNoAr(publicacao) && (
          <span className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-red-600/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
            No ar
          </span>
        )}

        <span className="absolute right-3 top-3 rounded-full border border-neutral-700 bg-neutral-950/80 px-3 py-1 text-xs text-neutral-300">
          {LADO[side]}
        </span>
      </div>

      <p data-testid="estado" className="text-sm text-neutral-500">
        Duelo em <span className="text-neutral-300">{estadoDoDuelo}</span> · publicação{' '}
        <span className="text-neutral-300">{publicacao.estado}</span>
      </p>

      {publicacao.erro !== null && <Erro>{MENSAGEM_DE_ERRO[publicacao.erro]}</Erro>}

      {publicacao.estado === 'publicando' && publicacao.modoLocal && (
        <Aviso>
          Modo local: a câmera está ligada, mas o vídeo não está saindo daqui. Falta a conta do
          fornecedor de vídeo — tarefa <span className="font-mono">L-19</span>.
        </Aviso>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {publicacao.estado === 'ocioso' || publicacao.estado === 'erro' ? (
          <Botao type="button" onClick={() => void ligarCamera()}>
            {publicacao.estado === 'erro' ? 'Tentar de novo' : 'Ligar câmera'}
          </Botao>
        ) : null}

        {publicacao.estado === 'previa' && (
          <Botao type="button" onClick={() => void entrarNoAr()}>
            Entrar no duelo
          </Botao>
        )}

        {podeCortar(publicacao) && (
          <>
            <button
              type="button"
              onClick={alternarVideo}
              className="rounded-lg border border-neutral-700 px-4 py-2 text-sm transition hover:border-neutral-500"
            >
              {publicacao.comVideo ? 'Cortar câmera' : 'Voltar câmera'}
            </button>
            <button
              type="button"
              onClick={alternarAudio}
              className="rounded-lg border border-neutral-700 px-4 py-2 text-sm transition hover:border-neutral-500"
            >
              {publicacao.comAudio ? 'Cortar microfone' : 'Voltar microfone'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
