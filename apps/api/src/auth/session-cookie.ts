import type { CookieSerializeOptions } from '@fastify/cookie';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { SESSION_TTL_MS, readSession, type PrismaClient, type User } from '@trendi/db';
import type { ApiConfig } from '../config.js';

/** O cookie que carrega a sessão. Ver decisão D-16. */
export const SESSION_COOKIE = 'trendi_session';

export function cookieOptions(config: ApiConfig): CookieSerializeOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProduction,
    path: '/',
    ...(config.cookieDomain === undefined ? {} : { domain: config.cookieDomain }),
  };
}

export function setSessionCookie(
  reply: FastifyReply,
  config: ApiConfig,
  token: string,
  expiresAt: Date,
): void {
  reply.setCookie(SESSION_COOKIE, token, {
    ...cookieOptions(config),
    expires: expiresAt,
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export function clearSessionCookie(reply: FastifyReply, config: ApiConfig): void {
  reply.clearCookie(SESSION_COOKIE, cookieOptions(config));
}

/** Quem fez esta requisição, renovando o cookie quando o prazo estica. */
export async function currentUser(
  prisma: PrismaClient,
  config: ApiConfig,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<User | null> {
  const token = request.cookies[SESSION_COOKIE];
  if (token === undefined) return null;

  const session = await readSession(prisma, token);
  if (session === null) {
    clearSessionCookie(reply, config);
    return null;
  }

  if (session.renewed) setSessionCookie(reply, config, token, session.expiresAt);
  return session.user;
}

/** Como o cliente enxerga quem está logado. Só o que a tela precisa. */
export function publicUser(user: User) {
  return {
    id: user.id,
    handle: user.handle,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    role: user.role,
    email: user.email,
    emailVerified: user.emailVerifiedAt !== null,
    /** Falso em quem entrou só por Google ou Discord e nunca criou senha. */
    hasPassword: user.passwordHash !== null,
  };
}
