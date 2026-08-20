import type { Duel, PrismaClient } from '@trendi/db';
import {
  applyEvent,
  tallySimpleVote,
  type DuelEvent,
  type DuelSnapshot,
  type DuelState,
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
  | 'ja_votou';

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

  const { transition, snapshot } = resultado;

  // Ao chegar em RESULTADO, o placar sai junto: é o mesmo instante para quem
  // está assistindo, e evita duelo em "resultado" sem resultado.
  const apuracao = snapshot.state === 'result' ? await tallyOf(prisma, duelId) : null;

  const atualizado = await prisma.$transaction(async (tx) => {
    const gravado = await tx.duel.update({
      where: { id: duelId },
      data: {
        state: snapshot.state,
        stateEnteredAt: now,
        ...(snapshot.state === 'running' ? { startedAt: now } : {}),
        ...(snapshot.state === 'result' || snapshot.state === 'cancelled' ? { endedAt: now } : {}),
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

    await tx.duelTransition.create({
      data: {
        duelId,
        fromState: transition.from,
        toState: transition.to,
        event: transition.event,
        abandonment: transition.abandonment,
        occurredAt: now,
        ...(transition.reason === undefined ? {} : { reason: transition.reason }),
      },
    });

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
