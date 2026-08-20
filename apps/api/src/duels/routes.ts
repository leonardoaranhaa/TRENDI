import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@trendi/db';
import type { DuelEvent, Side } from '@trendi/shared';
import type { ApiConfig } from '../config.js';
import { currentUser } from '../auth/session-cookie.js';
import { applyDuelEvent, castVote, duelView, voteStatus, type DuelProblem } from './service.js';

/** Rotas do duelo e da votação simples (C-09). */

interface DuelRoutesOptions {
  readonly config: ApiConfig;
  readonly prisma: PrismaClient;
}

const EVENTS = new Set<DuelEvent>([
  'match_found',
  'both_accepted',
  'choice_closed',
  'preparation_done',
  'execution_done',
  'voting_closed',
  'abandon',
  'cancel',
]);

/** Cada recusa do serviço tem o código HTTP que conta a história certa. */
const STATUS: Record<DuelProblem, number> = {
  duelo_nao_encontrado: 404,
  nao_e_competidor: 403,
  transicao_invalida: 409,
  votacao_fechada: 409,
  ja_votou: 409,
};

export async function duelRoutes(app: FastifyInstance, options: DuelRoutesOptions): Promise<void> {
  const { config, prisma } = options;

  app.get('/duels/:duelId', async (request, reply) => {
    const { duelId } = request.params as { duelId: string };
    const duel = await prisma.duel.findUnique({ where: { id: duelId } });
    if (duel === null) return reply.code(404).send({ error: 'duelo_nao_encontrado' });

    const user = await currentUser(prisma, config, request, reply);
    const status = await voteStatus(prisma, duelId, user?.id ?? null);
    if ('problem' in status) return reply.code(STATUS[status.problem]).send({ error: status.problem });

    return { duel: duelView(duel), voting: status };
  });

  /**
   * Move o duelo. Só os dois competidores mandam aqui: o público escolhe
   * desafio e vota, mas não decide quando começa nem quando acaba.
   */
  app.post('/duels/:duelId/events', async (request, reply) => {
    const user = await currentUser(prisma, config, request, reply);
    if (user === null) return reply.code(401).send({ error: 'sem_sessao' });

    const { duelId } = request.params as { duelId: string };
    const body = (request.body ?? {}) as { event?: unknown };
    if (typeof body.event !== 'string' || !EVENTS.has(body.event as DuelEvent)) {
      return reply.code(400).send({ error: 'evento_invalido' });
    }

    const resultado = await applyDuelEvent(prisma, duelId, user.id, body.event as DuelEvent);
    if ('problem' in resultado) {
      return reply.code(STATUS[resultado.problem]).send({ error: resultado.problem });
    }
    return resultado;
  });

  app.post('/duels/:duelId/votes', async (request, reply) => {
    const user = await currentUser(prisma, config, request, reply);
    if (user === null) return reply.code(401).send({ error: 'sem_sessao' });
    if (user.status !== 'active') return reply.code(403).send({ error: 'conta_suspensa' });

    const { duelId } = request.params as { duelId: string };
    const body = (request.body ?? {}) as { votedFor?: unknown };
    if (body.votedFor !== 'a' && body.votedFor !== 'b') {
      return reply.code(400).send({ error: 'voto_invalido' });
    }

    const resultado = await castVote(prisma, duelId, user.id, body.votedFor as Side);
    if ('problem' in resultado) {
      return reply.code(STATUS[resultado.problem]).send({ error: resultado.problem });
    }

    return reply.code(201).send({ ok: true, stand: resultado.stand });
  });
}
