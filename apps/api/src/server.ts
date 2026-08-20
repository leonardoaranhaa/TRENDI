import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';
import type { PrismaClient } from '@trendi/db';
import {
  CHOICE_WINDOW_MS,
  CROSS_VOTE_WEIGHTS,
  MATCH_ACCEPT_MS,
  MIN_VOTERS_FOR_RANKING,
  MIN_VOTERS_PER_STAND,
  PREPARATION_MS,
  VOTING_WINDOW_MS,
} from '@trendi/shared';
import { nativeAuthRoutes } from './auth/native-routes.js';
import { authRoutes } from './auth/routes.js';
import { duelRoutes } from './duels/routes.js';
import { loadConfig, type ApiConfig } from './config.js';

export interface ServerOptions {
  readonly prisma: PrismaClient;
  readonly config?: ApiConfig;
  readonly logger?: boolean;
}

/**
 * A API HTTP: identidade hoje (C-02); fila, catálogo e ranking depois.
 *
 * Logs estruturados desde o dia 1 — 02-arquitetura/stack.md.
 */
export function buildServer(options: ServerOptions): FastifyInstance {
  const config = options.config ?? loadConfig();
  const app = Fastify({ logger: options.logger ?? true });

  app.register(cookie);
  // O cliente web manda cookie de sessão, então precisa vir na lista e com
  // credenciais liberadas. Origem aberta aqui seria entregar a sessão.
  app.register(cors, { origin: config.webOrigin, credentials: true });
  // Global folgado; cadastro, login e recuperação apertam por rota.
  if (config.rateLimitEnabled) app.register(rateLimit, { global: false, max: 100, timeWindow: '1 minute' });
  app.register(authRoutes, { config, prisma: options.prisma });
  app.register(nativeAuthRoutes, { config, prisma: options.prisma });
  app.register(duelRoutes, { config, prisma: options.prisma });

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
