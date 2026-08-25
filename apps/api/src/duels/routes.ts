import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@trendi/db';
import type { DuelEvent, Side } from '@trendi/shared';
import type { ApiConfig } from '../config.js';
import { currentUser } from '../auth/session-cookie.js';
import type { VideoProvider } from '@trendi/video';
import {
  applyDuelEvent,
  castVote,
  competitorView,
  duelView,
  issuePublishCredential,
  voteStatus,
  type DuelProblem,
} from './service.js';

/** Rotas do duelo e da votação simples (C-09). */

interface DuelRoutesOptions {
  readonly config: ApiConfig;
  readonly prisma: PrismaClient;
  /** Sem fornecedor de mídia, o duelo anda sem vídeo — é o que a Fase 1 faz até L-19. */
  readonly video?: VideoProvider;
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
  palco_nao_aberto: 409,
};

export async function duelRoutes(app: FastifyInstance, options: DuelRoutesOptions): Promise<void> {
  const { config, prisma, video } = options;

  /**
   * O duelo como a plateia o vê.
   *
   * **Sem sessão também responde**: assistir não pede conta — falar e votar,
   * sim. É o que deixa link e clipe circularem sem parede de cadastro.
   *
   * Os dois competidores saem com nome: estádio que mostra UUID no lugar de
   * quem está duelando não é estádio.
   */
  app.get('/duels/:duelId', async (request, reply) => {
    const { duelId } = request.params as { duelId: string };
    const duel = await prisma.duel.findUnique({
      where: { id: duelId },
      include: { userA: true, userB: true },
    });
    if (duel === null) return reply.code(404).send({ error: 'duelo_nao_encontrado' });

    const user = await currentUser(prisma, config, request, reply);
    const status = await voteStatus(prisma, duelId, user?.id ?? null);
    if ('problem' in status) return reply.code(STATUS[status.problem]).send({ error: status.problem });

    return {
      duel: duelView(duel),
      competitors: { a: competitorView(duel.userA), b: competitorView(duel.userB) },
      voting: status,
    };
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

    const resultado = await applyDuelEvent(
      prisma,
      duelId,
      user.id,
      body.event as DuelEvent,
      new Date(),
      video,
    );
    if ('problem' in resultado) {
      return reply.code(STATUS[resultado.problem]).send({ error: resultado.problem });
    }
    return resultado;
  });

  /**
   * Credencial para o competidor publicar do navegador (C-03).
   *
   * Sai curta e por lado. Quem captura de fato é a tela do competidor, que é
   * C-04 — aqui é a porta que ela vai usar.
   */
  app.post('/duels/:duelId/publish-credential', async (request, reply) => {
    if (video === undefined) return reply.code(503).send({ error: 'video_indisponivel' });

    const user = await currentUser(prisma, config, request, reply);
    if (user === null) return reply.code(401).send({ error: 'sem_sessao' });

    const { duelId } = request.params as { duelId: string };
    const resultado = await issuePublishCredential(prisma, video, duelId, user.id);
    if ('problem' in resultado) {
      return reply.code(STATUS[resultado.problem]).send({ error: resultado.problem });
    }

    return {
      credential: {
        side: resultado.credential.side,
        token: resultado.credential.token,
        ingestEndpoint: resultado.credential.ingestEndpoint,
        expiresAt: resultado.credential.expiresAt.toISOString(),
      },
    };
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
