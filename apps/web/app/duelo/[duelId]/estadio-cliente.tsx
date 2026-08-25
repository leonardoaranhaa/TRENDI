'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '@trendi/shared';
import type { DueloNoAr } from '../../../lib/api';
import { abrirChat, type Chat } from '../../../lib/chat-cliente';
import { mensagemDoVoto, situacaoDaPlateia } from '../../../lib/estadio';
import { tocar, type PlayerDoDuelo } from '../../../lib/ivs-player';
import { Aviso, Botao, Erro } from '../../componentes/campos';

/**
 * A arquibancada (C-06).
 *
 * Junta as três coisas que já existiam e não se falavam: o quadro montado no
 * servidor (C-05), o chat do duelo (C-07) e a votação (C-09).
 *
 * Duas coisas que esta tela **não** faz, e não por falta de tempo:
 *
 * - **Placar parcial.** A API não devolve apuração durante a votação, e a
 *   tela não inventa uma. Placar que anda ao vivo empurra quem ainda não
 *   votou para o lado que está ganhando.
 * - **Barulhômetro.** É a C-13, e a D-05 exige que ele seja visualmente
 *   inconfundível com o placar — isso se itera quando ele existir.
 */

interface Props {
  readonly duelId: string;
  readonly inicial: DueloNoAr;
  readonly eu: { id: string; handle: string } | null;
}

/** O piso: o duelo é relido de tempos em tempos mesmo sem aviso da sala. */
const RELEITURA_MS = 3000;

export function EstadioCliente({ duelId, inicial, eu }: Props) {
  const [dados, setDados] = useState(inicial);
  const [mensagens, setMensagens] = useState<ChatMessage[]>([]);
  const [rascunho, setRascunho] = useState('');
  const [erroDoVoto, setErroDoVoto] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const chatRef = useRef<Chat | null>(null);

  const { duel, competitors, voting } = dados;
  const situacao = situacaoDaPlateia(duel.state as never, {
    logado: eu !== null,
    jaVotou: voting.yourVote,
    temVideo: duel.playbackUrl !== null,
  });

  const reler = useCallback(async () => {
    try {
      const resposta = await fetch(`/api/duels/${duelId}`, { credentials: 'include' });
      if (resposta.ok) setDados((await resposta.json()) as DueloNoAr);
    } catch {
      // Rede instável não pode derrubar o estádio: quem está assistindo
      // continua com o que já tem na tela.
    }
  }, [duelId]);

  // Duas fontes para o mesmo fato. A sala avisa na hora em que o duelo muda
  // de estado; a releitura é o piso, para o caso de o aviso não chegar — e
  // hoje ele não chega, porque a API ainda não fala com o tempo real (C-38).
  useEffect(() => {
    const relogio = setInterval(() => void reler(), RELEITURA_MS);
    return () => clearInterval(relogio);
  }, [reler]);

  // O chat exige conta: o ticket é assinado para uma pessoa (D-16).
  useEffect(() => {
    if (eu === null) return;
    let vivo = true;

    void abrirChat(duelId, {
      aoReceber: (novas) => setMensagens((atuais) => [...atuais, ...novas].slice(-100)),
      aoMudarEstado: () => void reler(),
    })
      .then((chat) => {
        if (!vivo) chat.fechar();
        else chatRef.current = chat;
      })
      .catch(() => {
        // Chat fora do ar não tira ninguém do estádio: o duelo continua.
      });

    return () => {
      vivo = false;
      chatRef.current?.fechar();
      chatRef.current = null;
    };
  }, [duelId, eu, reler]);

  // O player só entra quando existe o que tocar. Sem conta AWS (L-19) o
  // `playbackUrl` vem nulo e este efeito não faz nada.
  useEffect(() => {
    const video = videoRef.current;
    if (video === null || duel.playbackUrl === null) return;

    let player: PlayerDoDuelo | null = null;
    let vivo = true;

    void tocar(video, duel.playbackUrl)
      .then((criado) => {
        if (vivo) player = criado;
        else criado.destruir();
      })
      .catch(() => {
        // Navegador sem WebAssembly, ou stream que não abre: o resto da tela
        // continua de pé, e a faixa de ação diz o que está acontecendo.
      });

    return () => {
      vivo = false;
      player?.destruir();
    };
  }, [duel.playbackUrl]);

  const votar = useCallback(
    async (votedFor: 'a' | 'b') => {
      setErroDoVoto(null);
      const resposta = await fetch(`/api/duels/${duelId}/votes`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ votedFor }),
      });

      if (!resposta.ok) {
        const corpo = (await resposta.json().catch(() => ({}))) as { error?: string };
        setErroDoVoto(corpo.error ?? 'desconhecido');
        return;
      }
      await reler();
    },
    [duelId, reler],
  );

  const enviar = useCallback(() => {
    chatRef.current?.enviar(rascunho);
    setRascunho('');
  }, [rascunho]);

  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">
          {nomeDe(competitors.a)} <span className="text-neutral-500">x</span>{' '}
          {nomeDe(competitors.b)}
        </h1>
        <p className="text-neutral-400" data-testid="chamada">
          {situacao.chamada}
        </p>
        <span className="hidden" data-testid="estado">
          {duel.state}
        </span>
      </header>

      {/* O lado A fica à esquerda aqui pelo mesmo motivo que fica à esquerda
          no quadro composto (D-22): é o que faz "o da esquerda" significar
          alguém, e é do que placar e barulhômetro vão depender. */}
      <section className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-neutral-800 text-sm">
          <Lado nome={nomeDe(competitors.a)} lado="A" />
          <Lado nome={nomeDe(competitors.b)} lado="B" />
        </div>

        <div className="aspect-video overflow-hidden rounded-xl border border-neutral-800 bg-black">
          {duel.playbackUrl === null ? (
            <div
              className="flex h-full items-center justify-center px-6 text-center text-sm text-neutral-500"
              data-testid="sem-video"
            >
              Ainda não há vídeo saindo daqui. O duelo funciona, o chat funciona, o voto funciona —
              falta a conta do fornecedor de vídeo.
            </div>
          ) : (
            <video ref={videoRef} data-testid="quadro" playsInline className="h-full w-full" />
          )}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        {situacao.podeVotar && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-neutral-400">
              Quem levou melhor? O voto é secreto até a janela fechar.
            </p>
            <div className="flex gap-3">
              <Botao onClick={() => void votar('a')} data-testid="votar-a">
                {nomeDe(competitors.a)}
              </Botao>
              <Botao onClick={() => void votar('b')} data-testid="votar-b">
                {nomeDe(competitors.b)}
              </Botao>
            </div>
            <Erro>{erroDoVoto === null ? null : mensagemDoVoto(erroDoVoto)}</Erro>
          </div>
        )}

        {situacao.precisaEntrar && (
          <Aviso>
            <Link
              href={`/entrar?voltar=${encodeURIComponent(`/duelo/${duelId}`)}`}
              className="underline underline-offset-4"
              data-testid="entrar-para-votar"
            >
              Entre para votar
            </Link>{' '}
            — assistir não pede conta, votar pede.
          </Aviso>
        )}

        {/* Quantas contas votaram é atmosfera, não placar: não diz em quem. */}
        <p className="text-sm text-neutral-500" data-testid="votantes">
          {voting.voters === 1 ? '1 voto registrado' : `${voting.voters} votos registrados`}
        </p>

        {situacao.mostraPlacar && voting.tally !== null && (
          <div className="rounded-xl border border-neutral-800 px-4 py-3" data-testid="placar">
            <p className="font-medium">
              {voting.tally.winner === 'undecided'
                ? 'Empate.'
                : `Vitória de ${nomeDe(voting.tally.winner === 'a' ? competitors.a : competitors.b)}.`}
            </p>
            <p className="text-sm text-neutral-500">
              {porcentagem(voting.tally.shareA)} x {porcentagem(voting.tally.shareB)}
            </p>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3" data-testid="chat">
        <h2 className="text-sm font-medium text-neutral-400">Chat</h2>

        <ul className="flex h-64 flex-col gap-2 overflow-y-auto rounded-xl border border-neutral-800 px-4 py-3 text-sm">
          {mensagens.map((mensagem) => (
            <li key={mensagem.id}>
              <span className="text-neutral-500">{mensagem.handle}</span> {mensagem.body}
            </li>
          ))}
        </ul>

        {situacao.podeFalar ? (
          <form
            className="flex gap-2"
            onSubmit={(evento) => {
              evento.preventDefault();
              enviar();
            }}
          >
            <input
              value={rascunho}
              onChange={(evento) => setRascunho(evento.target.value)}
              placeholder="Falar com a arquibancada"
              data-testid="rascunho"
              className="flex-1 rounded-lg border border-neutral-800 bg-transparent px-3 py-2 outline-none focus:border-neutral-600"
            />
            <Botao type="submit">Enviar</Botao>
          </form>
        ) : (
          <Aviso>
            <Link
              href={`/entrar?voltar=${encodeURIComponent(`/duelo/${duelId}`)}`}
              className="underline underline-offset-4"
              data-testid="entrar-para-falar"
            >
              Entre para falar no chat
            </Link>
            . Para assistir, não precisa.
          </Aviso>
        )}
      </section>

      <Link href="/" className="text-sm text-neutral-500 underline underline-offset-4">
        Voltar
      </Link>
    </>
  );
}

function Lado({ nome, lado }: { nome: string; lado: 'A' | 'B' }) {
  return (
    <div className="bg-neutral-950 px-4 py-3">
      <span className="text-neutral-500">Lado {lado}</span>
      <p className="font-medium">{nome}</p>
    </div>
  );
}

function nomeDe(competidor: { handle: string; displayName: string | null }): string {
  return competidor.displayName ?? competidor.handle;
}

function porcentagem(fracao: number): string {
  return `${Math.round(fracao * 100)}%`;
}
