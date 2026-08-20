import { generateCodeVerifier, generateState } from 'arctic';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  SESSION_TTL_MS,
  createSession,
  deleteSession,
  readSession,
  signInWithProvider,
  updateProfile,
  validateHandle,
  type PrismaClient,
  type User,
} from '@trendi/db';
import { issueRealtimeTicket } from '@trendi/shared/realtime-ticket';
import type { ApiConfig } from '../config.js';
import { availableProviders } from './providers.js';

export const SESSION_COOKIE = 'trendi_session';
const STATE_COOKIE = 'trendi_oauth_state';
const VERIFIER_COOKIE = 'trendi_oauth_verifier';
/** A ida até o provedor e a volta. Se demorar mais que isso, foi abandonada. */
const OAUTH_FLOW_TTL_MS = 10 * 60 * 1000;

interface AuthOptions {
  readonly config: ApiConfig;
  readonly prisma: PrismaClient;
}

/** Como o cliente enxerga quem está logado. Só o que a tela precisa. */
function publicUser(user: User) {
  return {
    id: user.id,
    handle: user.handle,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    role: user.role,
  };
}

export async function authRoutes(app: FastifyInstance, options: AuthOptions): Promise<void> {
  const { config, prisma } = options;
  const providers = availableProviders(config);

  const cookieBase = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: config.isProduction,
    path: '/',
    ...(config.cookieDomain === undefined ? {} : { domain: config.cookieDomain }),
  };

  function setSessionCookie(reply: FastifyReply, token: string, expiresAt: Date): void {
    reply.setCookie(SESSION_COOKIE, token, {
      ...cookieBase,
      expires: expiresAt,
      maxAge: Math.floor(SESSION_TTL_MS / 1000),
    });
  }

  /** A sessão de quem fez a requisição, renovando o cookie se o prazo esticou. */
  async function currentUser(request: FastifyRequest, reply: FastifyReply): Promise<User | null> {
    const token = request.cookies[SESSION_COOKIE];
    if (token === undefined) return null;

    const session = await readSession(prisma, token);
    if (session === null) {
      reply.clearCookie(SESSION_COOKIE, cookieBase);
      return null;
    }

    if (session.renewed) setSessionCookie(reply, token, session.expiresAt);
    return session.user;
  }

  app.get('/auth/providers', () => ({ providers: [...providers.keys()] }));

  app.get('/auth/:provider/start', async (request, reply) => {
    const { provider: name } = request.params as { provider: string };
    const provider = providers.get(name);
    if (provider === undefined) {
      return reply.code(404).send({ error: 'provedor_desconhecido', provider: name });
    }

    const state = generateState();
    const verifier = generateCodeVerifier();
    const shortLived = { ...cookieBase, maxAge: Math.floor(OAUTH_FLOW_TTL_MS / 1000) };

    reply.setCookie(STATE_COOKIE, state, shortLived);
    if (provider.usesPkce) reply.setCookie(VERIFIER_COOKIE, verifier, shortLived);

    return reply.redirect(provider.authorizationUrl(state, verifier).toString());
  });

  app.get('/auth/:provider/callback', async (request, reply) => {
    const { provider: name } = request.params as { provider: string };
    const query = request.query as { code?: string; state?: string; error?: string };
    const provider = providers.get(name);

    if (provider === undefined) {
      return reply.code(404).send({ error: 'provedor_desconhecido', provider: name });
    }
    // A pessoa clicou em "cancelar" na tela do provedor. Não é erro nosso.
    if (query.error !== undefined) {
      return reply.redirect(`${config.webOrigin}/entrar?erro=${encodeURIComponent(query.error)}`);
    }

    const expectedState = request.cookies[STATE_COOKIE];
    const verifier = request.cookies[VERIFIER_COOKIE] ?? '';

    // O state é o que separa um login de verdade de um CSRF: sem o cookie
    // que só este navegador tem, a volta não vale.
    if (
      query.state === undefined ||
      expectedState === undefined ||
      query.state !== expectedState ||
      query.code === undefined
    ) {
      return reply.code(400).send({ error: 'estado_invalido' });
    }
    if (provider.usesPkce && verifier === '') {
      return reply.code(400).send({ error: 'estado_invalido' });
    }

    reply.clearCookie(STATE_COOKIE, cookieBase);
    reply.clearCookie(VERIFIER_COOKIE, cookieBase);

    let profile;
    try {
      profile = await provider.fetchProfile(query.code, verifier);
    } catch (error) {
      request.log.warn({ err: error, provider: name }, 'falha ao ler perfil do provedor');
      return reply.code(502).send({ error: 'provedor_indisponivel' });
    }

    const { user, created } = await signInWithProvider(prisma, profile);
    const session = await createSession(prisma, user.id);
    setSessionCookie(reply, session.token, session.expiresAt);

    // Quem acabou de chegar vai para o perfil escolher o handle; quem já é de
    // casa volta para onde estava.
    return reply.redirect(`${config.webOrigin}${created ? '/perfil?novo=1' : '/'}`);
  });

  app.get('/auth/session', async (request, reply) => {
    const user = await currentUser(request, reply);
    if (user === null) return reply.code(401).send({ error: 'sem_sessao' });
    return { user: publicUser(user) };
  });

  app.post('/auth/logout', async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE];
    if (token !== undefined) await deleteSession(prisma, token);
    reply.clearCookie(SESSION_COOKIE, cookieBase);
    return { ok: true };
  });

  /** Credencial de entrada no servidor de tempo real (C-07). */
  app.post('/auth/realtime-ticket', async (request, reply) => {
    const user = await currentUser(request, reply);
    if (user === null) return reply.code(401).send({ error: 'sem_sessao' });

    const body = (request.body ?? {}) as { duelId?: string };
    const { ticket, expiresAt } = issueRealtimeTicket(
      { userId: user.id, duelId: body.duelId },
      config.realtimeTicketSecret,
    );
    return { ticket, expiresAt: expiresAt.toISOString() };
  });

  app.patch('/me', async (request, reply) => {
    const user = await currentUser(request, reply);
    if (user === null) return reply.code(401).send({ error: 'sem_sessao' });

    const body = (request.body ?? {}) as { handle?: unknown; displayName?: unknown };
    const changes: { handle?: string; displayName?: string | null } = {};

    if (body.handle !== undefined) {
      if (typeof body.handle !== 'string') {
        return reply.code(400).send({ error: 'handle_invalido', problema: 'caracteres_invalidos' });
      }
      const problema = validateHandle(body.handle);
      if (problema !== null) return reply.code(400).send({ error: 'handle_invalido', problema });
      changes.handle = body.handle;
    }

    if (body.displayName !== undefined) {
      if (body.displayName !== null && typeof body.displayName !== 'string') {
        return reply.code(400).send({ error: 'nome_invalido' });
      }
      const nome = typeof body.displayName === 'string' ? body.displayName.trim() : null;
      if (nome !== null && nome.length > 60) return reply.code(400).send({ error: 'nome_invalido' });
      changes.displayName = nome === '' ? null : nome;
    }

    const resultado = await updateProfile(prisma, user.id, changes);
    if ('problem' in resultado) return reply.code(409).send({ error: resultado.problem });
    return { user: publicUser(resultado.user) };
  });
}
