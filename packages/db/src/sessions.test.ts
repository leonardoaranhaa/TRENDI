import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPrismaClient, type PrismaClient, type User } from './client.js';
import { signInWithProvider } from './identity.js';
import {
  SESSION_TTL_MS,
  createSession,
  deleteAllSessions,
  deleteExpiredSessions,
  deleteSession,
  hashSessionToken,
  readSession,
} from './sessions.js';
import { startTestDatabase, type TestDatabase } from './testing.js';

let database: TestDatabase;
let prisma: PrismaClient;

beforeAll(async () => {
  database = await startTestDatabase();
  prisma = createPrismaClient(database.connectionString);
});

afterAll(async () => {
  await prisma.$disconnect();
  await database.close();
});

async function novoUsuario(): Promise<User> {
  const { user } = await signInWithProvider(prisma, {
    provider: 'fake',
    providerAccountId: `acc-${Math.random().toString(36).slice(2)}`,
    username: `pessoa_${Math.random().toString(36).slice(2, 8)}`,
  });
  return user;
}

describe('sessão', () => {
  it('abre e lê', async () => {
    const user = await novoUsuario();
    const { token } = await createSession(prisma, user.id);

    const ativa = await readSession(prisma, token);

    expect(ativa?.user.id).toBe(user.id);
    expect(ativa?.renewed).toBe(false);
  });

  it('guarda só o hash do token — decisão D-16', async () => {
    const user = await novoUsuario();
    const { token, sessionId } = await createSession(prisma, user.id);

    const linha = await prisma.session.findUniqueOrThrow({ where: { id: sessionId } });

    expect(linha.tokenHash).toBe(hashSessionToken(token));
    expect(linha.tokenHash).not.toBe(token);
    expect(JSON.stringify(linha)).not.toContain(token);
  });

  it('não reconhece token inventado', async () => {
    expect(await readSession(prisma, 'token-que-nunca-existiu')).toBeNull();
  });

  it('recusa e apaga sessão vencida', async () => {
    const user = await novoUsuario();
    const { token, sessionId } = await createSession(prisma, user.id);
    const depoisDoPrazo = new Date(Date.now() + SESSION_TTL_MS + 1_000);

    expect(await readSession(prisma, token, depoisDoPrazo)).toBeNull();
    expect(await prisma.session.findUnique({ where: { id: sessionId } })).toBeNull();
  });

  it('estica o prazo quando passa da metade', async () => {
    const user = await novoUsuario();
    const { token, expiresAt } = await createSession(prisma, user.id);
    const quaseNoFim = new Date(Date.now() + SESSION_TTL_MS * 0.75);

    const ativa = await readSession(prisma, token, quaseNoFim);

    expect(ativa?.renewed).toBe(true);
    expect(ativa!.expiresAt.getTime()).toBeGreaterThan(expiresAt.getTime());
  });

  it('sai', async () => {
    const user = await novoUsuario();
    const { token } = await createSession(prisma, user.id);

    await deleteSession(prisma, token);

    expect(await readSession(prisma, token)).toBeNull();
  });

  it('sai de todos os aparelhos', async () => {
    const user = await novoUsuario();
    const primeira = await createSession(prisma, user.id);
    const segunda = await createSession(prisma, user.id);

    expect(await deleteAllSessions(prisma, user.id)).toBe(2);
    expect(await readSession(prisma, primeira.token)).toBeNull();
    expect(await readSession(prisma, segunda.token)).toBeNull();
  });

  it('cada sessão tem token próprio', async () => {
    const user = await novoUsuario();
    const primeira = await createSession(prisma, user.id);
    const segunda = await createSession(prisma, user.id);

    expect(primeira.token).not.toBe(segunda.token);
  });

  it('faz faxina das vencidas', async () => {
    const user = await novoUsuario();
    await createSession(prisma, user.id);

    const apagadas = await deleteExpiredSessions(
      prisma,
      new Date(Date.now() + SESSION_TTL_MS + 1_000),
    );

    expect(apagadas).toBeGreaterThanOrEqual(1);
  });

  it('vai junto quando o usuário é apagado', async () => {
    const user = await novoUsuario();
    const { token } = await createSession(prisma, user.id);

    await prisma.user.delete({ where: { id: user.id } });

    expect(await readSession(prisma, token)).toBeNull();
  });
});
