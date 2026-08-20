import Fastify, { type FastifyInstance } from 'fastify';
import {
  CHOICE_WINDOW_MS,
  CROSS_VOTE_WEIGHTS,
  MATCH_ACCEPT_MS,
  MIN_VOTERS_FOR_RANKING,
  MIN_VOTERS_PER_STAND,
  PREPARATION_MS,
  VOTING_WINDOW_MS,
} from '@trendi/shared';

/**
 * Esqueleto da API. Os serviços de verdade entram nas tarefas seguintes:
 * identidade em C-02, fila e matchmaking em C-16, votação em C-09.
 *
 * Logs estruturados desde o dia 1 — 02-arquitetura/stack.md.
 */
export function buildServer(): FastifyInstance {
  const app = Fastify({ logger: true });

  app.get('/health', () => ({ status: 'ok', service: 'api' }));

  // As regras do duelo vivem em @trendi/shared, um lugar só. A API publica
  // os números para o cliente não ter a própria cópia divergindo.
  app.get('/rules', () => ({
    crossVote: {
      weights: CROSS_VOTE_WEIGHTS,
      minVotersPerStand: MIN_VOTERS_PER_STAND,
      minVotersForRanking: MIN_VOTERS_FOR_RANKING,
    },
    timeoutsMs: {
      matchAccept: MATCH_ACCEPT_MS,
      choiceWindow: CHOICE_WINDOW_MS,
      preparation: PREPARATION_MS,
      votingWindow: VOTING_WINDOW_MS,
    },
  }));

  return app;
}
