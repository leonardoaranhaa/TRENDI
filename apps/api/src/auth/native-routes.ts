import type { FastifyInstance } from 'fastify';
import {
  consumeAuthToken,
  createSession,
  issueAuthToken,
  markEmailVerified,
  registerWithPassword,
  replacePassword,
  setInitialPassword,
  signInWithPassword,
  validateHandle,
  validatePassword,
  type PrismaClient,
} from '@trendi/db';
import type { ApiConfig } from '../config.js';
import { sendAuthEmail } from './email.js';
import { currentUser, publicUser, setSessionCookie } from './session-cookie.js';

/**
 * Conta nativa: criar, entrar, verificar e-mail e recuperar senha (C-37).
 *
 * A conta nativa é a porta da frente; Google e Discord são atalho — decisão
 * D-19. Ninguém precisa ter conta em plataforma nenhuma para entrar num duelo.
 */

interface NativeAuthOptions {
  readonly config: ApiConfig;
  readonly prisma: PrismaClient;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) return null;
  return email;
}

export async function nativeAuthRoutes(
  app: FastifyInstance,
  options: NativeAuthOptions,
): Promise<void> {
  const { config, prisma } = options;

  /**
   * Limite de tentativas.
   *
   * Enquanto não há Redis (entra com C-16), a contagem é por processo. Numa
   * máquina só, que é o tamanho da Fase 1, resolve; com mais de uma, cada uma
   * conta a sua parte, e isso está anotado para não virar surpresa.
   */
  // A anotação fica na rota de qualquer jeito; quem decide se vale é o
  // registro do plugin, em server.ts.
  const limite = (max: number, janela: string) => ({ rateLimit: { max, timeWindow: janela } });

  app.post('/auth/register', { config: limite(5, '10 minutes') }, async (request, reply) => {
    const body = (request.body ?? {}) as {
      email?: unknown;
      password?: unknown;
      handle?: unknown;
      displayName?: unknown;
    };

    const email = readEmail(body.email);
    if (email === null) return reply.code(400).send({ error: 'email_invalido' });
    if (typeof body.password !== 'string') return reply.code(400).send({ error: 'senha_invalida' });

    const problemaSenha = validatePassword(body.password, email);
    if (problemaSenha !== null) {
      return reply.code(400).send({ error: 'senha_invalida', problema: problemaSenha });
    }

    let handle: string | undefined;
    if (body.handle !== undefined && body.handle !== '') {
      if (typeof body.handle !== 'string') {
        return reply.code(400).send({ error: 'handle_invalido', problema: 'caracteres_invalidos' });
      }
      const problemaHandle = validateHandle(body.handle);
      if (problemaHandle !== null) {
        return reply.code(400).send({ error: 'handle_invalido', problema: problemaHandle });
      }
      handle = body.handle;
    }

    const resultado = await registerWithPassword(prisma, {
      email,
      password: body.password,
      ...(handle === undefined ? {} : { handle }),
      ...(typeof body.displayName === 'string' ? { displayName: body.displayName.trim() } : {}),
    });

    if ('problem' in resultado) return reply.code(409).send({ error: resultado.problem });

    const session = await createSession(prisma, resultado.user.id);
    setSessionCookie(reply, config, session.token, session.expiresAt);

    const enviado = sendAuthEmail(
      config,
      request.log,
      'email_verification',
      email,
      resultado.verification.token,
    );

    return reply.code(201).send({ user: publicUser(resultado.user), ...enviado });
  });

  app.post('/auth/login', { config: limite(10, '5 minutes') }, async (request, reply) => {
    const body = (request.body ?? {}) as { email?: unknown; password?: unknown };
    const email = readEmail(body.email);

    if (email === null || typeof body.password !== 'string') {
      return reply.code(400).send({ error: 'credenciais_invalidas' });
    }

    const user = await signInWithPassword(prisma, email, body.password);
    // Uma resposta só para e-mail desconhecido, senha errada e conta
    // suspensa: distinguir vira lista de quem tem conta aqui.
    if (user === null) return reply.code(401).send({ error: 'credenciais_invalidas' });

    const session = await createSession(prisma, user.id);
    setSessionCookie(reply, config, session.token, session.expiresAt);
    return { user: publicUser(user) };
  });

  app.post('/auth/email/verify', async (request, reply) => {
    const body = (request.body ?? {}) as { token?: unknown };
    if (typeof body.token !== 'string') return reply.code(400).send({ error: 'token_invalido' });

    const userId = await consumeAuthToken(prisma, body.token, 'email_verification');
    if (userId === null) return reply.code(400).send({ error: 'token_invalido' });

    const user = await markEmailVerified(prisma, userId);
    return { user: publicUser(user) };
  });

  app.post(
    '/auth/email/resend',
    { config: limite(3, '10 minutes') },
    async (request, reply) => {
      const user = await currentUser(prisma, config, request, reply);
      if (user === null) return reply.code(401).send({ error: 'sem_sessao' });
      if (user.email === null) return reply.code(400).send({ error: 'sem_email' });
      if (user.emailVerifiedAt !== null) return { ok: true, alreadyVerified: true };

      const { token } = await issueAuthToken(prisma, user.id, 'email_verification');
      const enviado = sendAuthEmail(config, request.log, 'email_verification', user.email, token);
      return { ok: true, ...enviado };
    },
  );

  app.post('/auth/password/forgot', { config: limite(5, '15 minutes') }, async (request, reply) => {
    const body = (request.body ?? {}) as { email?: unknown };
    const email = readEmail(body.email);
    if (email === null) return reply.code(400).send({ error: 'email_invalido' });

    const user = await prisma.user.findUnique({ where: { email } });

    // Resposta igual exista ou não a conta, e exista ou não senha nela: o
    // formulário de recuperação não pode virar consulta de cadastro.
    if (user === null) return reply.code(202).send({ ok: true });

    const { token } = await issueAuthToken(prisma, user.id, 'password_reset');
    const enviado = sendAuthEmail(config, request.log, 'password_reset', email, token);
    return reply.code(202).send({ ok: true, ...enviado });
  });

  app.post('/auth/password/reset', async (request, reply) => {
    const body = (request.body ?? {}) as { token?: unknown; password?: unknown };
    if (typeof body.token !== 'string') return reply.code(400).send({ error: 'token_invalido' });
    if (typeof body.password !== 'string') return reply.code(400).send({ error: 'senha_invalida' });

    const problema = validatePassword(body.password);
    if (problema !== null) return reply.code(400).send({ error: 'senha_invalida', problema });

    const userId = await consumeAuthToken(prisma, body.token, 'password_reset');
    if (userId === null) return reply.code(400).send({ error: 'token_invalido' });

    // Derruba todas as sessões: quem redefine senha ou perdeu o acesso ou
    // desconfia de invasão, e nos dois casos manter sessão viva é manter o
    // problema. A pessoa entra de novo com a senha nova.
    await replacePassword(prisma, userId, body.password);
    return { ok: true };
  });

  /** Para quem entrou por Google ou Discord e quer poder entrar sem eles. */
  app.post('/auth/password/set', async (request, reply) => {
    const user = await currentUser(prisma, config, request, reply);
    if (user === null) return reply.code(401).send({ error: 'sem_sessao' });

    const body = (request.body ?? {}) as { password?: unknown };
    if (typeof body.password !== 'string') return reply.code(400).send({ error: 'senha_invalida' });

    const problema = validatePassword(body.password, user.email ?? undefined);
    if (problema !== null) return reply.code(400).send({ error: 'senha_invalida', problema });

    const definida = await setInitialPassword(prisma, user.id, body.password);
    if (!definida) return reply.code(409).send({ error: 'senha_ja_existe' });
    return { ok: true };
  });
}
