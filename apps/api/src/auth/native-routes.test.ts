import type { FastifyInstance, InjectOptions } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPrismaClient, type PrismaClient } from '@trendi/db';
import { startTestDatabase, type TestDatabase } from '@trendi/db/testing';
import { loadConfig } from '../config.js';
import { buildServer } from '../server.js';
import { encodeFakeCode } from './providers.js';
import { SESSION_COOKIE } from './session-cookie.js';

const SENHA = 'duelo na madrugada';
const WEB = 'http://localhost:3000';

let database: TestDatabase;
let prisma: PrismaClient;
let app: FastifyInstance;

const config = loadConfig({
  NODE_ENV: 'test',
  AUTH_FAKE_PROVIDER: '1',
  REALTIME_TICKET_SECRET: 'segredo-de-teste',
  WEB_ORIGIN: WEB,
  API_PUBLIC_URL: 'http://localhost:3001',
});

beforeAll(async () => {
  database = await startTestDatabase();
  prisma = createPrismaClient(database.connectionString);
  app = buildServer({ prisma, config, logger: false });
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
  await database.close();
});

function post(url: string, payload: Record<string, unknown>, cookie?: string) {
  // O tipo precisa ser explícito: com o objeto montado por espalhamento, o
  // TypeScript escolhe a sobrecarga encadeável do `inject` em vez da que
  // devolve a resposta.
  const options: InjectOptions = {
    method: 'POST',
    url,
    payload,
    ...(cookie === undefined ? {} : { cookies: { [SESSION_COOKIE]: cookie } }),
  };
  return app.inject(options);
}

async function cadastrar(email: string, extras: Record<string, unknown> = {}) {
  const response = await post('/auth/register', { email, password: SENHA, ...extras });
  const cookie = response.cookies.find((c) => c.name === SESSION_COOKIE)?.value ?? '';
  return { response, cookie, body: response.json() };
}

/** O link do e-mail volta na resposta fora de produção — ver auth/email.ts. */
function tokenDoLink(link: string): string {
  return new URL(link).searchParams.get('token') ?? '';
}

describe('criar conta', () => {
  it('cria e já entra', async () => {
    const { response, cookie, body } = await cadastrar('nativo@trendi.test');

    expect(response.statusCode).toBe(201);
    expect(cookie).toBeTruthy();
    expect(body.user).toMatchObject({
      handle: 'nativo',
      email: 'nativo@trendi.test',
      emailVerified: false,
      hasPassword: true,
    });

    const sessao = await app.inject({
      method: 'GET',
      url: '/auth/session',
      cookies: { [SESSION_COOKIE]: cookie },
    });
    expect(sessao.statusCode).toBe(200);
  });

  it('aceita handle escolhido na hora', async () => {
    const { body } = await cadastrar('escolhi@trendi.test', { handle: 'escolhido' });
    expect(body.user.handle).toBe('escolhido');
  });

  it('recusa e-mail malformado', async () => {
    for (const email of ['sem-arroba', 'a@b', '', 'com espaço@trendi.test', 'dois@@arrobas.test']) {
      const response = await post('/auth/register', { email, password: SENHA });
      expect(response.statusCode).toBe(400);
      expect(response.json().error).toBe('email_invalido');
    }
  });

  it('aceita acento no e-mail — a regra confere forma, não entrega', async () => {
    // Endereço com acento é válido por RFC. Se o provedor de e-mail recusar,
    // isso aparece no envio, e recusar aqui seria barrar endereço legítimo.
    const { response } = await cadastrar('joão@trendi.test');
    expect(response.statusCode).toBe(201);
  });

  it('recusa senha fraca dizendo qual é o problema', async () => {
    const curta = await post('/auth/register', { email: 'fraca@trendi.test', password: 'abc' });
    expect(curta.statusCode).toBe(400);
    expect(curta.json().problema).toBe('muito_curta');

    const obvia = await post('/auth/register', {
      email: 'obvia@trendi.test',
      password: 'password123',
    });
    expect(obvia.json().problema).toBe('obvia');
  });

  it('recusa handle fora da regra', async () => {
    const response = await post('/auth/register', {
      email: 'handleruim@trendi.test',
      password: SENHA,
      handle: 'admin',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().problema).toBe('reservado');
  });

  it('recusa e-mail repetido com 409', async () => {
    await cadastrar('repetido@trendi.test');
    const segunda = await post('/auth/register', {
      email: 'repetido@trendi.test',
      password: SENHA,
    });

    expect(segunda.statusCode).toBe(409);
    expect(segunda.json().error).toBe('email_em_uso');
  });
});

describe('entrar com senha', () => {
  it('entra e recebe cookie de sessão', async () => {
    await cadastrar('entrar@trendi.test');
    const response = await post('/auth/login', { email: 'entrar@trendi.test', password: SENHA });

    expect(response.statusCode).toBe(200);
    const cookie = response.cookies.find((c) => c.name === SESSION_COOKIE);
    expect(cookie?.httpOnly).toBe(true);
  });

  it('responde igual para senha errada e e-mail desconhecido', async () => {
    await cadastrar('mesmaresposta@trendi.test');

    const senhaErrada = await post('/auth/login', {
      email: 'mesmaresposta@trendi.test',
      password: 'outra coisa aqui',
    });
    const desconhecido = await post('/auth/login', {
      email: 'nunca-existiu@trendi.test',
      password: SENHA,
    });

    expect(senhaErrada.statusCode).toBe(401);
    expect(desconhecido.statusCode).toBe(401);
    expect(senhaErrada.json()).toEqual(desconhecido.json());
  });

  it('não deixa quem só tem OAuth entrar por senha', async () => {
    const start = await app.inject({ method: 'GET', url: '/auth/fake/start' });
    const state = start.cookies.find((c) => c.name === 'trendi_oauth_state')?.value ?? '';
    await app.inject({
      method: 'GET',
      url: `/auth/fake/callback?state=${state}&code=${encodeFakeCode({
        sub: 'so-google',
        email: 'so-google@trendi.test',
        username: 'so_google',
      })}`,
      cookies: { trendi_oauth_state: state },
    });

    const response = await post('/auth/login', {
      email: 'so-google@trendi.test',
      password: SENHA,
    });
    expect(response.statusCode).toBe(401);
  });
});

describe('verificação de e-mail', () => {
  it('verifica pelo link e não aceita o mesmo token de novo', async () => {
    const { body } = await cadastrar('verificar@trendi.test');
    const token = tokenDoLink(body.link);

    const primeira = await post('/auth/email/verify', { token });
    expect(primeira.statusCode).toBe(200);
    expect(primeira.json().user.emailVerified).toBe(true);

    const segunda = await post('/auth/email/verify', { token });
    expect(segunda.statusCode).toBe(400);
  });

  it('reenvia para quem ainda não verificou', async () => {
    const { cookie } = await cadastrar('reenvio@trendi.test');
    const response = await post('/auth/email/resend', {}, cookie);

    expect(response.statusCode).toBe(200);
    expect(response.json().link).toContain('/verificar-email');
  });

  it('recusa token inventado', async () => {
    const response = await post('/auth/email/verify', { token: 'nao-existe' });
    expect(response.statusCode).toBe(400);
  });
});

describe('recuperar senha', () => {
  it('redefine, derruba as sessões e passa a valer a nova', async () => {
    const { cookie } = await cadastrar('recupera@trendi.test');

    const pedido = await post('/auth/password/forgot', { email: 'recupera@trendi.test' });
    expect(pedido.statusCode).toBe(202);

    const reset = await post('/auth/password/reset', {
      token: tokenDoLink(pedido.json().link),
      password: 'senha completamente nova',
    });
    expect(reset.statusCode).toBe(200);

    // A sessão de antes morreu junto com a senha antiga.
    const sessaoVelha = await app.inject({
      method: 'GET',
      url: '/auth/session',
      cookies: { [SESSION_COOKIE]: cookie },
    });
    expect(sessaoVelha.statusCode).toBe(401);

    const antiga = await post('/auth/login', {
      email: 'recupera@trendi.test',
      password: SENHA,
    });
    expect(antiga.statusCode).toBe(401);

    const nova = await post('/auth/login', {
      email: 'recupera@trendi.test',
      password: 'senha completamente nova',
    });
    expect(nova.statusCode).toBe(200);
  });

  it('responde igual para e-mail que não existe', async () => {
    const response = await post('/auth/password/forgot', { email: 'ninguem@trendi.test' });

    expect(response.statusCode).toBe(202);
    expect(response.json().ok).toBe(true);
    expect(response.json().link).toBeUndefined();
  });

  it('recusa token gasto e senha fraca', async () => {
    const { body: _ } = await cadastrar('gasto@trendi.test');
    const pedido = await post('/auth/password/forgot', { email: 'gasto@trendi.test' });
    const token = tokenDoLink(pedido.json().link);

    const fraca = await post('/auth/password/reset', { token, password: 'abc' });
    expect(fraca.statusCode).toBe(400);
    expect(fraca.json().problema).toBe('muito_curta');

    await post('/auth/password/reset', { token, password: 'senha boa o suficiente' });
    const segundaVez = await post('/auth/password/reset', {
      token,
      password: 'mais uma senha boa',
    });
    expect(segundaVez.statusCode).toBe(400);
  });
});

describe('senha para quem entrou por OAuth', () => {
  it('define uma vez e recusa a segunda', async () => {
    const start = await app.inject({ method: 'GET', url: '/auth/fake/start' });
    const state = start.cookies.find((c) => c.name === 'trendi_oauth_state')?.value ?? '';
    const callback = await app.inject({
      method: 'GET',
      url: `/auth/fake/callback?state=${state}&code=${encodeFakeCode({
        sub: 'quer-senha-api',
        email: 'quer-senha-api@trendi.test',
        username: 'quer_senha_api',
      })}`,
      cookies: { trendi_oauth_state: state },
    });
    const cookie = callback.cookies.find((c) => c.name === SESSION_COOKIE)?.value ?? '';

    const primeira = await post('/auth/password/set', { password: SENHA }, cookie);
    expect(primeira.statusCode).toBe(200);

    const login = await post('/auth/login', {
      email: 'quer-senha-api@trendi.test',
      password: SENHA,
    });
    expect(login.statusCode).toBe(200);

    const segunda = await post('/auth/password/set', { password: 'outra senha aqui' }, cookie);
    expect(segunda.statusCode).toBe(409);
  });

  it('exige sessão', async () => {
    const response = await post('/auth/password/set', { password: SENHA });
    expect(response.statusCode).toBe(401);
  });
});

describe('limite de tentativas', () => {
  it('corta depois do teto configurado', async () => {
    const limitado = buildServer({
      prisma,
      config: { ...config, rateLimitEnabled: true },
      logger: false,
    });
    await limitado.ready();

    const codigos: number[] = [];
    for (let tentativa = 0; tentativa < 12; tentativa += 1) {
      const response = await limitado.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'forca-bruta@trendi.test', password: 'chute errado aqui' },
      });
      codigos.push(response.statusCode);
    }

    expect(codigos).toContain(429);
    await limitado.close();
  });
});
