import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { PrismaClient, User } from './client.js';
import { findFreeHandle, normalizeHandle } from './handles.js';
import { hashPassword, verifyPassword } from './passwords.js';

/**
 * Conta nativa: cadastro e login com e-mail e senha (decisão D-19).
 *
 * O Google é atalho; isto aqui é a porta da frente. Quem não quer conta em
 * plataforma nenhuma para entrar num duelo entra por aqui.
 */

export type TokenPurpose = 'email_verification' | 'password_reset';

const TOKEN_TTL_MS: Record<TokenPurpose, number> = {
  // Verificar e-mail pode esperar o fim de semana.
  email_verification: 24 * 60 * 60 * 1000,
  // Redefinir senha é urgente por natureza, e prazo curto reduz a janela de
  // quem tiver acesso à caixa de entrada por engano.
  password_reset: 60 * 60 * 1000,
};

export function hashAuthToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export interface IssuedToken {
  /** Vai no link do e-mail. Não é guardado em lugar nenhum. */
  readonly token: string;
  readonly expiresAt: Date;
}

/**
 * Emite um token de uso único, derrubando os anteriores do mesmo propósito:
 * pedir "esqueci minha senha" duas vezes não deixa dois links vivos.
 */
export async function issueAuthToken(
  prisma: PrismaClient,
  userId: string,
  purpose: TokenPurpose,
  now = new Date(),
): Promise<IssuedToken> {
  await prisma.authToken.deleteMany({ where: { userId, purpose, usedAt: null } });

  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(now.getTime() + TOKEN_TTL_MS[purpose]);
  await prisma.authToken.create({
    data: { id: randomUUID(), userId, purpose, tokenHash: hashAuthToken(token), expiresAt },
  });

  return { token, expiresAt };
}

/** Gasta o token e devolve de quem ele era, ou `null` se não presta mais. */
export async function consumeAuthToken(
  prisma: PrismaClient,
  token: string,
  purpose: TokenPurpose,
  now = new Date(),
): Promise<string | null> {
  const stored = await prisma.authToken.findUnique({ where: { tokenHash: hashAuthToken(token) } });
  if (stored === null) return null;
  if (stored.purpose !== purpose) return null;
  if (stored.usedAt !== null) return null;
  if (stored.expiresAt.getTime() <= now.getTime()) return null;

  // Uso único de verdade: marca como usado e só aceita se ninguém tiver
  // marcado antes — dois cliques no mesmo link não valem duas vezes.
  const { count } = await prisma.authToken.updateMany({
    where: { id: stored.id, usedAt: null },
    data: { usedAt: now },
  });
  return count === 1 ? stored.userId : null;
}

export type RegistrationProblem = 'email_em_uso' | 'handle_em_uso';

export interface RegistrationResult {
  readonly user: User;
  readonly verification: IssuedToken;
}

/**
 * Cria conta nativa.
 *
 * O e-mail nasce sem verificação: dá para entrar e assistir, e a verificação
 * é o que destrava o que exige confiança — ligar conta de OAuth ao mesmo
 * e-mail, por exemplo.
 */
export async function registerWithPassword(
  prisma: PrismaClient,
  input: { email: string; password: string; handle?: string; displayName?: string },
): Promise<RegistrationResult | { problem: RegistrationProblem }> {
  const email = input.email.trim().toLowerCase();

  if ((await prisma.user.findUnique({ where: { email } })) !== null) {
    return { problem: 'email_em_uso' };
  }

  if (input.handle !== undefined) {
    if ((await prisma.user.findUnique({ where: { handle: input.handle } })) !== null) {
      return { problem: 'handle_em_uso' };
    }
  }

  const handle =
    input.handle ??
    (await findFreeHandle(
      normalizeHandle(email.split('@')[0] ?? ''),
      async (candidate) => (await prisma.user.findUnique({ where: { handle: candidate } })) !== null,
    ));

  const user = await prisma.user.create({
    data: {
      id: randomUUID(),
      handle,
      email,
      passwordHash: await hashPassword(input.password),
      displayName: input.displayName ?? null,
    },
  });

  return { user, verification: await issueAuthToken(prisma, user.id, 'email_verification') };
}

/**
 * Confere e-mail e senha.
 *
 * Devolve `null` tanto para e-mail desconhecido quanto para senha errada, e
 * gasta o mesmo tempo nos dois casos: resposta diferente vira lista de quem
 * tem conta aqui.
 */
export async function signInWithPassword(
  prisma: PrismaClient,
  email: string,
  password: string,
): Promise<User | null> {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });

  if (user === null || user.passwordHash === null) {
    // Gasta o mesmo trabalho de um scrypt para o tempo de resposta não
    // denunciar se a conta existe.
    await hashPassword(password);
    return null;
  }

  if (!(await verifyPassword(password, user.passwordHash))) return null;
  if (user.status !== 'active') return null;
  return user;
}

export async function markEmailVerified(
  prisma: PrismaClient,
  userId: string,
  now = new Date(),
): Promise<User> {
  return prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: now } });
}

/**
 * Troca a senha e derruba todas as sessões.
 *
 * Quem redefine senha ou perdeu o acesso, ou desconfia que alguém entrou —
 * nos dois casos, manter as outras sessões vivas seria manter o problema.
 */
export async function replacePassword(
  prisma: PrismaClient,
  userId: string,
  password: string,
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(password) },
  });
  await prisma.session.deleteMany({ where: { userId } });
}

/** Define senha em conta que só tinha OAuth, sem derrubar a sessão atual. */
export async function setInitialPassword(
  prisma: PrismaClient,
  userId: string,
  password: string,
): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user === null || user.passwordHash !== null) return false;

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(password) },
  });
  return true;
}
