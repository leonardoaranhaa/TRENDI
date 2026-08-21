import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { PrismaClient, User } from './client.js';

/**
 * Sessões de login (decisão D-16).
 *
 * O token só existe no cookie do navegador. No banco fica o hash — dump
 * vazado não vira sessão de ninguém.
 */

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias
/** Sessão com menos da metade do prazo é renovada no acesso seguinte. */
export const SESSION_RENEW_THRESHOLD_MS = SESSION_TTL_MS / 2;

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export interface NewSession {
  /** Vai para o cookie. Não é guardado em lugar nenhum do servidor. */
  readonly token: string;
  readonly sessionId: string;
  readonly expiresAt: Date;
}

export async function createSession(
  prisma: PrismaClient,
  userId: string,
  now = new Date(),
): Promise<NewSession> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  const session = await prisma.session.create({
    data: { id: randomUUID(), userId, tokenHash: hashSessionToken(token), expiresAt },
  });

  return { token, sessionId: session.id, expiresAt };
}

export interface ActiveSession {
  readonly user: User;
  readonly sessionId: string;
  readonly expiresAt: Date;
  /** A sessão foi esticada nesta leitura: o cookie precisa ser reescrito. */
  readonly renewed: boolean;
}

/**
 * Devolve a sessão viva do token, ou `null`. Sessão vencida é apagada na
 * passagem — o banco não acumula lixo esperando faxina.
 */
export async function readSession(
  prisma: PrismaClient,
  token: string,
  now = new Date(),
): Promise<ActiveSession | null> {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: true },
  });
  if (session === null) return null;

  if (session.expiresAt.getTime() <= now.getTime()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  const remaining = session.expiresAt.getTime() - now.getTime();
  if (remaining > SESSION_RENEW_THRESHOLD_MS) {
    return {
      user: session.user,
      sessionId: session.id,
      expiresAt: session.expiresAt,
      renewed: false,
    };
  }

  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  await prisma.session.update({ where: { id: session.id }, data: { expiresAt } });
  return { user: session.user, sessionId: session.id, expiresAt, renewed: true };
}

export async function deleteSession(prisma: PrismaClient, token: string): Promise<void> {
  await prisma.session
    .delete({ where: { tokenHash: hashSessionToken(token) } })
    .catch(() => undefined);
}

/** Sai de todos os aparelhos. Serve para "encerrar outras sessões" e para banimento. */
export async function deleteAllSessions(prisma: PrismaClient, userId: string): Promise<number> {
  const { count } = await prisma.session.deleteMany({ where: { userId } });
  return count;
}

export async function deleteExpiredSessions(
  prisma: PrismaClient,
  now = new Date(),
): Promise<number> {
  const { count } = await prisma.session.deleteMany({ where: { expiresAt: { lte: now } } });
  return count;
}
