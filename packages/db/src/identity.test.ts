import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPrismaClient, type PrismaClient } from './client.js';
import { signInWithProvider, updateProfile, type ProviderProfile } from './identity.js';
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

function profile(overrides: Partial<ProviderProfile> = {}): ProviderProfile {
  return {
    provider: 'google',
    providerAccountId: `acc-${Math.random().toString(36).slice(2)}`,
    email: undefined,
    displayName: 'Leonardo Aranha',
    username: 'Leonardo Aranha',
    ...overrides,
  };
}

describe('entrar por provedor', () => {
  it('cria usuário e conta na primeira vez', async () => {
    const { user, created } = await signInWithProvider(prisma, profile({ username: 'leo' }));

    expect(created).toBe(true);
    expect(user.handle).toBe('leo');
    expect(user.role).toBe('viewer');
    expect(user.status).toBe('active');
  });

  it('reencontra a mesma conta na segunda vez', async () => {
    const dados = profile({ username: 'bia' });

    const primeira = await signInWithProvider(prisma, dados);
    const segunda = await signInWithProvider(prisma, dados);

    expect(segunda.created).toBe(false);
    expect(segunda.user.id).toBe(primeira.user.id);
    expect(await prisma.user.count({ where: { id: primeira.user.id } })).toBe(1);
  });

  it('atualiza nome e foto a cada entrada', async () => {
    const dados = profile({ username: 'ravi', displayName: 'Ravi' });
    const primeira = await signInWithProvider(prisma, dados);

    const segunda = await signInWithProvider(prisma, {
      ...dados,
      displayName: 'Ravi da Zona Leste',
      avatarUrl: 'https://exemplo.test/ravi.png',
    });

    expect(segunda.user.id).toBe(primeira.user.id);
    expect(segunda.user.displayName).toBe('Ravi da Zona Leste');
    expect(segunda.user.avatarUrl).toBe('https://exemplo.test/ravi.png');
  });

  it('desduplica o handle quando o nome já está em uso', async () => {
    const primeira = await signInWithProvider(prisma, profile({ username: 'duda' }));
    const segunda = await signInWithProvider(prisma, profile({ username: 'duda' }));

    expect(primeira.user.handle).toBe('duda');
    expect(segunda.user.handle).toBe('duda2');
    expect(segunda.user.id).not.toBe(primeira.user.id);
  });

  it('não casa contas diferentes pelo mesmo e-mail', async () => {
    const email = 'compartilhado@trendi.test';
    const google = await signInWithProvider(prisma, profile({ username: 'nina', email }));
    const discord = await signInWithProvider(
      prisma,
      profile({ provider: 'discord', username: 'nina', email }),
    );

    // Contas de provedores diferentes são pessoas diferentes até que alguém
    // ligue as duas de propósito. E-mail igual não é prova de identidade.
    expect(discord.user.id).not.toBe(google.user.id);
    expect(google.user.email).toBe(email);
    expect(discord.user.email).toBeNull();
  });

  it('aceita provedor que não devolve e-mail', async () => {
    const { user } = await signInWithProvider(
      prisma,
      profile({ provider: 'discord', username: 'sem_email', email: undefined }),
    );

    expect(user.email).toBeNull();
    expect(user.handle).toBe('sem_email');
  });
});

describe('perfil mínimo', () => {
  it('troca handle e nome', async () => {
    const { user } = await signInWithProvider(prisma, profile({ username: 'antes' }));

    const resultado = await updateProfile(prisma, user.id, {
      handle: 'depois',
      displayName: 'Nome Novo',
    });

    expect(resultado).toEqual({ user: expect.objectContaining({ handle: 'depois' }) });
    expect('user' in resultado && resultado.user.displayName).toBe('Nome Novo');
  });

  it('recusa handle de outra pessoa', async () => {
    const dono = await signInWithProvider(prisma, profile({ username: 'ocupado' }));
    const outro = await signInWithProvider(prisma, profile({ username: 'livre' }));

    const resultado = await updateProfile(prisma, outro.user.id, { handle: dono.user.handle });

    expect(resultado).toEqual({ problem: 'handle_em_uso' });
  });

  it('deixa a pessoa manter o próprio handle', async () => {
    const { user } = await signInWithProvider(prisma, profile({ username: 'mesmo' }));

    const resultado = await updateProfile(prisma, user.id, {
      handle: user.handle,
      displayName: 'Só mudei o nome',
    });

    expect('user' in resultado).toBe(true);
  });
});
