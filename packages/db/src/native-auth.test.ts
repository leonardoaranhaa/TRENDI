import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPrismaClient, type PrismaClient } from './client.js';
import { signInWithProvider } from './identity.js';
import {
  consumeAuthToken,
  issueAuthToken,
  markEmailVerified,
  registerWithPassword,
  replacePassword,
  setInitialPassword,
  signInWithPassword,
} from './native-auth.js';
import { createSession, readSession } from './sessions.js';
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

const SENHA = 'duelo na madrugada';

async function criarConta(email: string, extras: { handle?: string } = {}) {
  const resultado = await registerWithPassword(prisma, { email, password: SENHA, ...extras });
  if ('problem' in resultado) throw new Error(`cadastro falhou: ${resultado.problem}`);
  return resultado;
}

describe('cadastro nativo', () => {
  it('cria conta com e-mail e senha', async () => {
    const { user, verification } = await criarConta('leo@trendi.test');

    expect(user.email).toBe('leo@trendi.test');
    expect(user.handle).toBe('leo');
    expect(user.emailVerifiedAt).toBeNull();
    expect(verification.token).toBeTruthy();
  });

  it('não guarda a senha, só o hash', async () => {
    const { user } = await criarConta('segredo@trendi.test');
    const linha = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });

    expect(linha.passwordHash).toBeTruthy();
    expect(JSON.stringify(linha)).not.toContain(SENHA);
  });

  it('normaliza o e-mail', async () => {
    const { user } = await criarConta('  MAIUSCULO@Trendi.Test  ');
    expect(user.email).toBe('maiusculo@trendi.test');
  });

  it('recusa e-mail já cadastrado', async () => {
    await criarConta('repetido@trendi.test');
    const segunda = await registerWithPassword(prisma, {
      email: 'repetido@trendi.test',
      password: SENHA,
    });

    expect(segunda).toEqual({ problem: 'email_em_uso' });
  });

  it('recusa handle já usado', async () => {
    await criarConta('dono@trendi.test', { handle: 'nome_tomado' });
    const segunda = await registerWithPassword(prisma, {
      email: 'outro@trendi.test',
      password: SENHA,
      handle: 'nome_tomado',
    });

    expect(segunda).toEqual({ problem: 'handle_em_uso' });
  });

  it('desduplica o handle tirado do e-mail', async () => {
    const primeira = await criarConta('bia@trendi.test');
    const segunda = await criarConta('bia@outrolugar.test');

    expect(primeira.user.handle).toBe('bia');
    expect(segunda.user.handle).toBe('bia2');
  });
});

describe('login nativo', () => {
  it('entra com a senha certa', async () => {
    const { user } = await criarConta('entra@trendi.test');
    const logado = await signInWithPassword(prisma, 'entra@trendi.test', SENHA);

    expect(logado?.id).toBe(user.id);
  });

  it('aceita e-mail com caixa e espaço diferentes', async () => {
    await criarConta('caixa@trendi.test');
    expect(await signInWithPassword(prisma, '  Caixa@Trendi.test ', SENHA)).not.toBeNull();
  });

  it('recusa senha errada', async () => {
    await criarConta('senhaerrada@trendi.test');
    expect(await signInWithPassword(prisma, 'senhaerrada@trendi.test', 'outra coisa')).toBeNull();
  });

  it('recusa e-mail desconhecido sem contar que é desconhecido', async () => {
    expect(await signInWithPassword(prisma, 'ninguem@trendi.test', SENHA)).toBeNull();
  });

  it('recusa quem só tem OAuth, sem vazar que a conta existe', async () => {
    const { user } = await signInWithProvider(prisma, {
      provider: 'google',
      providerAccountId: 'so-oauth',
      email: 'so-oauth@trendi.test',
      username: 'so_oauth',
    });

    expect(user.passwordHash).toBeNull();
    expect(await signInWithPassword(prisma, 'so-oauth@trendi.test', SENHA)).toBeNull();
  });

  it('recusa conta suspensa', async () => {
    const { user } = await criarConta('suspenso@trendi.test');
    await prisma.user.update({ where: { id: user.id }, data: { status: 'suspended' } });

    expect(await signInWithPassword(prisma, 'suspenso@trendi.test', SENHA)).toBeNull();
  });
});

describe('token de uso único', () => {
  it('verifica e-mail e não serve duas vezes', async () => {
    const { user, verification } = await criarConta('verifica@trendi.test');

    expect(await consumeAuthToken(prisma, verification.token, 'email_verification')).toBe(user.id);
    expect(await consumeAuthToken(prisma, verification.token, 'email_verification')).toBeNull();
  });

  it('não vale para outro propósito', async () => {
    const { verification } = await criarConta('proposito@trendi.test');
    expect(await consumeAuthToken(prisma, verification.token, 'password_reset')).toBeNull();
  });

  it('vence', async () => {
    const { user } = await criarConta('vencido@trendi.test');
    const { token, expiresAt } = await issueAuthToken(prisma, user.id, 'password_reset');

    expect(await consumeAuthToken(prisma, token, 'password_reset', new Date(expiresAt.getTime() + 1))).toBeNull();
  });

  it('pedir de novo invalida o pedido anterior', async () => {
    const { user } = await criarConta('doispedidos@trendi.test');
    const primeiro = await issueAuthToken(prisma, user.id, 'password_reset');
    const segundo = await issueAuthToken(prisma, user.id, 'password_reset');

    expect(await consumeAuthToken(prisma, primeiro.token, 'password_reset')).toBeNull();
    expect(await consumeAuthToken(prisma, segundo.token, 'password_reset')).toBe(user.id);
  });

  it('não reconhece token inventado', async () => {
    expect(await consumeAuthToken(prisma, 'nunca-existiu', 'password_reset')).toBeNull();
  });
});

describe('trocar senha', () => {
  it('passa a valer a nova e derruba as sessões', async () => {
    const { user } = await criarConta('trocasenha@trendi.test');
    const { token } = await createSession(prisma, user.id);

    await replacePassword(prisma, user.id, 'senha completamente nova');

    expect(await readSession(prisma, token)).toBeNull();
    expect(await signInWithPassword(prisma, 'trocasenha@trendi.test', SENHA)).toBeNull();
    expect(
      await signInWithPassword(prisma, 'trocasenha@trendi.test', 'senha completamente nova'),
    ).not.toBeNull();
  });

  it('deixa quem entrou por OAuth criar uma senha', async () => {
    const { user } = await signInWithProvider(prisma, {
      provider: 'discord',
      providerAccountId: 'quer-senha',
      email: 'quer-senha@trendi.test',
      username: 'quer_senha',
    });

    expect(await setInitialPassword(prisma, user.id, SENHA)).toBe(true);
    expect(await signInWithPassword(prisma, 'quer-senha@trendi.test', SENHA)).not.toBeNull();
    // Segunda vez não: trocar senha existente é outro fluxo, com confirmação.
    expect(await setInitialPassword(prisma, user.id, 'outra senha qualquer')).toBe(false);
  });
});

describe('conta nativa e OAuth no mesmo e-mail', () => {
  it('liga os dois quando o e-mail está verificado dos dois lados', async () => {
    const { user, verification } = await criarConta('mesma-pessoa@trendi.test');
    await consumeAuthToken(prisma, verification.token, 'email_verification');
    await markEmailVerified(prisma, user.id);

    const porGoogle = await signInWithProvider(prisma, {
      provider: 'google',
      providerAccountId: 'g-mesma-pessoa',
      email: 'mesma-pessoa@trendi.test',
      emailVerified: true,
      username: 'mesma_pessoa',
    });

    expect(porGoogle.user.id).toBe(user.id);
    expect(porGoogle.linked).toBe(true);
    expect(await signInWithPassword(prisma, 'mesma-pessoa@trendi.test', SENHA)).not.toBeNull();
  });

  it('não liga quando a conta daqui não verificou o e-mail', async () => {
    // Senão bastaria cadastrar com o e-mail de outra pessoa e esperar ela
    // entrar pelo Google para herdar a conta dela.
    const { user } = await criarConta('nao-verificado@trendi.test');

    const porGoogle = await signInWithProvider(prisma, {
      provider: 'google',
      providerAccountId: 'g-nao-verificado',
      email: 'nao-verificado@trendi.test',
      emailVerified: true,
      username: 'nao_verificado',
    });

    expect(porGoogle.user.id).not.toBe(user.id);
    expect(porGoogle.user.email).toBeNull();
  });

  it('não liga quando o provedor não verificou o e-mail', async () => {
    const { user, verification } = await criarConta('provedor-frouxo@trendi.test');
    await consumeAuthToken(prisma, verification.token, 'email_verification');
    await markEmailVerified(prisma, user.id);

    const porDiscord = await signInWithProvider(prisma, {
      provider: 'discord',
      providerAccountId: 'd-frouxo',
      email: 'provedor-frouxo@trendi.test',
      emailVerified: false,
      username: 'frouxo',
    });

    expect(porDiscord.user.id).not.toBe(user.id);
  });
});
