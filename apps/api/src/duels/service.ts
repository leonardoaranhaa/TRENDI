import type { Duel, PrismaClient } from '@trendi/db';
import type { PublishCredential, VideoProvider } from '@trendi/video';
import {
  applyEvent,
  stateDurationMs,
  tallySimpleVote,
  tick,
  type DuelEvent,
  type DuelSnapshot,
  type DuelState,
  type DuelTransition,
  type Side,
  type SimpleTally,
  type Stand,
} from '@trendi/shared';

/**
 * Serviço de duelo: o que move o estado e o que apura o voto (C-09).
 *
 * A regra de transição mora em `@trendi/shared` e é pura. Aqui é o que a
 * regra não sabe fazer: ler e gravar, e registrar cada passagem em
 * `duel_transitions` — auditoria é requisito, não luxo (convenção 3).
 *
 * Quem move o duelo, nesta fase, são os dois competidores. Timeout automático
 * depende de um agendador, que chega com a fila (C-16); até lá o duelo anda
 * porque alguém clica, que é o "tudo manual" previsto para a Fase 1.
 */

export type DuelProblem =
  | 'duelo_nao_encontrado'
  | 'nao_e_competidor'
  | 'transicao_invalida'
  | 'votacao_fechada'
  | 'ja_votou'
  | 'palco_nao_aberto';

function snapshotOf(duel: Duel): DuelSnapshot {
  return {
    state: duel.state as DuelState,
    enteredAt: duel.stateEnteredAt.getTime(),
    ...(duel.chosenDurationS === null ? {} : { executionMs: duel.chosenDurationS * 1000 }),
  };
}

export interface DuelView {
  readonly id: string;
  readonly state: DuelState;
  readonly creatorA: string;
  readonly creatorB: string;
  readonly winner: string | null;
  readonly scoreA: number | null;
  readonly scoreB: number | null;
  readonly countsForRanking: boolean;
  /** Onde a plateia assiste. Só existe com a composição no ar. */
  readonly playbackUrl: string | null;
}

export function duelView(duel: Duel): DuelView {
  return {
    id: duel.id,
    state: duel.state as DuelState,
    creatorA: duel.creatorA,
    creatorB: duel.creatorB,
    winner: duel.winner,
    scoreA: duel.scoreA === null ? null : Number(duel.scoreA),
    scoreB: duel.scoreB === null ? null : Number(duel.scoreB),
    countsForRanking: duel.countsForRanking,
    playbackUrl: duel.playbackUrl,
  };
}

/**
 * Aplica um evento no duelo, em nome de um dos competidores.
 *
 * A transição é registrada mesmo quando leva a cancelamento — principalmente
 * quando leva, porque é dela que sai a desistência (regras §5).
 */
export async function applyDuelEvent(
  prisma: PrismaClient,
  duelId: string,
  actorId: string,
  event: DuelEvent,
  now = new Date(),
  video?: VideoProvider,
): Promise<{ duel: DuelView } | { problem: DuelProblem }> {
  const duel = await prisma.duel.findUnique({ where: { id: duelId } });
  if (duel === null) return { problem: 'duelo_nao_encontrado' };
  if (actorId !== duel.creatorA && actorId !== duel.creatorB) return { problem: 'nao_e_competidor' };

  let resultado;
  try {
    resultado = applyEvent(snapshotOf(duel), event, now.getTime());
  } catch {
    return { problem: 'transicao_invalida' };
  }

  // Estado de duração zero anda sozinho. O ACEITE é assim: o arquivo de
  // regras o chama de instantâneo, e ele existe para aparecer na auditoria
  // como ponto de não retorno — não para o duelo ficar parado nele.
  const transitions: DuelTransition[] = [resultado.transition];
  let snapshot = resultado.snapshot;
  for (;;) {
    const automatica = stateDurationMs(snapshot) === 0 ? tick(snapshot, now.getTime()) : null;
    if (automatica === null) break;
    transitions.push(automatica.transition);
    snapshot = automatica.snapshot;
  }

  // Ao chegar em RESULTADO, o placar sai junto: é o mesmo instante para quem
  // está assistindo, e evita duelo em "resultado" sem resultado.
  const apuracao = snapshot.state === 'result' ? await tallyOf(prisma, duelId) : null;

  // A mídia acompanha o estado: palco no ACEITE, composição na EXECUÇÃO, e
  // tudo desligado quando o duelo sai do ar. Cada passagem conta — inclusive
  // as automáticas, senão o palco do ACEITE nunca abriria. Falha de mídia não
  // trava a transição: o duelo precisa poder ser cancelado com o fornecedor
  // fora do ar.
  let midia: MediaPatch = {};
  if (video !== undefined) {
    for (const passagem of transitions) {
      midia = { ...midia, ...(await moveMedia(video, { ...duel, ...midia }, passagem.to)) };
    }
  }

  const atualizado = await prisma.$transaction(async (tx) => {
    const gravado = await tx.duel.update({
      where: { id: duelId },
      data: {
        state: snapshot.state,
        stateEnteredAt: now,
        ...(snapshot.state === 'running' ? { startedAt: now } : {}),
        ...(snapshot.state === 'result' || snapshot.state === 'cancelled' ? { endedAt: now } : {}),
        ...midia,
        ...(apuracao === null
          ? {}
          : {
              winner: apuracao.winner,
              scoreA: apuracao.shareA,
              scoreB: apuracao.shareB,
              countsForRanking: false,
            }),
      },
    });

    // Toda passagem vira linha, inclusive as automáticas: auditoria com buraco
    // não é auditoria (convenção 3).
    for (const passagem of transitions) {
      await tx.duelTransition.create({
        data: {
          duelId,
          fromState: passagem.from,
          toState: passagem.to,
          event: passagem.event,
          abandonment: passagem.abandonment,
          occurredAt: now,
          ...(passagem.reason === undefined ? {} : { reason: passagem.reason }),
        },
      });
    }

    return gravado;
  });

  return { duel: duelView(atualizado) };
}

/**
 * Registra um voto.
 *
 * Uma conta, um voto — garantido pela chave da tabela, não por consulta antes
 * de gravar, que perderia a corrida entre dois cliques.
 *
 * A arquibancada vem da presença: quem escolheu um lado no chat vota como
 * daquele lado. Na Fase 1 isso não muda o peso (é `tallySimpleVote`), mas já
 * fica registrado para a apuração cruzada da Fase 2.
 */
export async function castVote(
  prisma: PrismaClient,
  duelId: string,
  userId: string,
  votedFor: Side,
): Promise<{ stand: Stand } | { problem: DuelProblem }> {
  const duel = await prisma.duel.findUnique({ where: { id: duelId } });
  if (duel === null) return { problem: 'duelo_nao_encontrado' };
  if (duel.state !== 'voting') return { problem: 'votacao_fechada' };

  const presence = await prisma.attendance.findUnique({
    where: { duelId_userId: { duelId, userId } },
  });
  const stand = (presence?.stand ?? 'general') as Stand;

  try {
    await prisma.resultVote.create({ data: { duelId, userId, votedFor, stand } });
  } catch {
    // Chave primária (duelo, usuário) já ocupada: segundo voto da mesma conta.
    return { problem: 'ja_votou' };
  }

  return { stand };
}

export async function tallyOf(prisma: PrismaClient, duelId: string): Promise<SimpleTally> {
  const votes = await prisma.resultVote.findMany({
    where: { duelId },
    select: { votedFor: true, annulled: true },
  });

  return tallySimpleVote(votes.map((vote) => ({ votedFor: vote.votedFor as Side, annulled: vote.annulled })));
}

export interface VoteStatus {
  readonly state: DuelState;
  /** Quantas contas já votaram. Não diz em quem — ver comentário abaixo. */
  readonly voters: number;
  readonly yourVote: Side | null;
  /** A apuração só aparece depois que o duelo chega em RESULTADO. */
  readonly tally: SimpleTally | null;
}

/**
 * O que o cliente pode saber durante a votação.
 *
 * Parcial não sai: placar que anda ao vivo empurra quem ainda não votou para
 * o lado que está ganhando, e o resultado passa a medir a onda em vez do
 * desempenho. O número de votantes sai, porque isso é atmosfera, não placar.
 */
export async function voteStatus(
  prisma: PrismaClient,
  duelId: string,
  userId: string | null,
): Promise<VoteStatus | { problem: DuelProblem }> {
  const duel = await prisma.duel.findUnique({ where: { id: duelId } });
  if (duel === null) return { problem: 'duelo_nao_encontrado' };

  const [voters, meu] = await Promise.all([
    prisma.resultVote.count({ where: { duelId, annulled: false } }),
    userId === null
      ? Promise.resolve(null)
      : prisma.resultVote.findUnique({ where: { duelId_userId: { duelId, userId } } }),
  ]);

  const encerrado = duel.state === 'result';
  return {
    state: duel.state as DuelState,
    voters,
    yourVote: meu === null ? null : (meu.votedFor as Side),
    tally: encerrado ? await tallyOf(prisma, duelId) : null,
  };
}

/** O que a mídia precisa virar quando o duelo entra num estado. */
type MediaPatch = {
  stageId?: string | null;
  compositionId?: string | null;
  playbackUrl?: string | null;
  recordingUrl?: string | null;
};

/** O mínimo que a mídia precisa saber do duelo para decidir o que fazer. */
interface MediaState {
  readonly id: string;
  readonly stageId?: string | null;
  readonly compositionId?: string | null;
}

async function moveMedia(
  video: VideoProvider,
  duel: MediaState,
  to: DuelState,
): Promise<MediaPatch> {
  try {
    if (to === 'accepted' && (duel.stageId ?? null) === null) {
      const palco = await video.createStage(duel.id);
      return { stageId: palco.stageId };
    }

    if (to === 'running' && duel.stageId != null && (duel.compositionId ?? null) === null) {
      const composicao = await video.startComposition(duel.stageId);
      return { compositionId: composicao.compositionId, playbackUrl: composicao.playbackUrl };
    }

    // Sai do ar em VOTAÇÃO: o que se julga é o que aconteceu, não o que o
    // competidor faz enquanto a plateia decide.
    if ((to === 'voting' || to === 'result' || to === 'cancelled') && duel.compositionId != null) {
      const gravacao = await video.stopComposition(duel.compositionId);
      const patch: MediaPatch = { compositionId: null, playbackUrl: null };
      if (gravacao !== null) patch.recordingUrl = gravacao.url;
      if (to !== 'voting' && duel.stageId != null) await video.closeStage(duel.stageId);
      return patch;
    }

    if ((to === 'result' || to === 'cancelled') && duel.stageId != null) {
      await video.closeStage(duel.stageId);
    }
  } catch {
    // Silêncio de propósito: registrar a transição importa mais do que
    // desligar o palco. Palco órfão é problema de limpeza; transição perdida
    // é auditoria furada, e a convenção 3 não abre mão dela.
    return {};
  }

  return {};
}

/**
 * Sobe a composição de um duelo que está rodando sem ela (C-05).
 *
 * Isso acontece quando a mídia falha na transição para EXECUÇÃO: a transição
 * segue assim mesmo, porque auditoria vale mais que palco, e o duelo fica no
 * ar **sem ninguém poder assistir**. Não há agendador nesta fase — ele é a
 * C-16 —, então a segunda chance acontece no próximo momento em que alguém
 * bate na API por causa deste duelo, que é o competidor pedindo credencial.
 */
async function garantirComposicao(
  prisma: PrismaClient,
  video: VideoProvider,
  duel: Duel,
): Promise<void> {
  if (duel.state !== 'running') return;
  if (duel.compositionId !== null || duel.stageId === null) return;

  try {
    const composicao = await video.startComposition(duel.stageId);

    // Os dois competidores podem pedir credencial ao mesmo tempo, e o duelo
    // pode ter saído de EXECUÇÃO enquanto a composição subia. Quem perder a
    // corrida desliga o que acabou de ligar: duas composições no ar custam
    // dobrado e entregam dois quadros diferentes para a mesma plateia.
    const { count } = await prisma.duel.updateMany({
      where: { id: duel.id, state: 'running', compositionId: null },
      data: {
        compositionId: composicao.compositionId,
        playbackUrl: composicao.playbackUrl,
      },
    });
    if (count === 0) await video.stopComposition(composicao.compositionId);
  } catch {
    // Mesmo silêncio do `moveMedia`: sem composição o duelo ainda anda, e a
    // credencial que o competidor pediu não depende dela.
  }
}

/**
 * Credencial para um competidor publicar do navegador.
 *
 * Só os dois do duelo pegam credencial, e só depois do ACEITE — antes disso
 * não há palco, e emitir token para quem não vai duelar é abrir porta à toa.
 */
export async function issuePublishCredential(
  prisma: PrismaClient,
  video: VideoProvider,
  duelId: string,
  actorId: string,
): Promise<{ credential: PublishCredential } | { problem: DuelProblem }> {
  const duel = await prisma.duel.findUnique({ where: { id: duelId } });
  if (duel === null) return { problem: 'duelo_nao_encontrado' };
  if (actorId !== duel.creatorA && actorId !== duel.creatorB) return { problem: 'nao_e_competidor' };
  if (duel.stageId === null) return { problem: 'palco_nao_aberto' };

  await garantirComposicao(prisma, video, duel);

  const side: Side = actorId === duel.creatorA ? 'a' : 'b';
  return { credential: await video.issuePublishCredential(duel.stageId, side) };
}
