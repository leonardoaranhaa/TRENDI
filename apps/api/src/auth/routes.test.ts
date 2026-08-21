import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPrismaClient, type PrismaClient } from '@trendi/db';
import { startTestDatabase, type TestDatabase } from '@trendi/db/testing';
import { verifyRealtimeTicket } from '@trendi/shared/realtime-ticket';
import { loadConfig } from '../config.js';
import { buildServer } from '../server.js';
import { encodeFakeCode } from './providers.js';
import { SESSION_COOKIE } from './routes.js';

const SECRET = 'segredo-de-teste';
const WEB = 'http://localhost:3000';

let database: TestDatabase;
let prisma: PrismaClient;
let app: FastifyInstance;

const config = loadConfig({
  NODE_ENV: 'test',
  AUTH_FAKE_PROVIDER: '1',
  REALTIME_TICKET_SECRET: SECRET,
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

/** Faz o login inteiro pelo provedor falso e devolve o cookie de sessão. */
async function entrar(perfil: { sub: string; name?: string; username?: string; email?: string }) {
  const start = await app.inject({ method: 'GET', url: '/auth/fake/start' });
  const state = start.cookies.find((c) => c.name === 'trendi_oauth_state')?.value ?? '';

  const callback = await app.inject({
    method: 'GET',
    url: `/auth/fake/callback?state=${encodeURIComponent(state)}&code=${encodeFakeCode(perfil)}`,
    cookies: { trendi_oauth_state: state },
  });

  const session = callback.cookies.find((c) => c.name === SESSION_COOKIE)?.value ?? '';
  return { start, callback, session };
}

describe('entrar', () => {
  it('manda para o provedor guardando o state', async () => {
    const response = await app.inject({ method: 'GET', url: '/auth/fake/start' });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toContain('/auth/fake/callback');
    expect(response.cookies.find((c) => c.name === 'trendi_oauth_state')?.value).toBeTruthy();
  });

  it('recusa provedor que não existe', async () => {
    const response = await app.inject({ method: 'GET', url: '/auth/inventado/start' });
    expect(response.statusCode).toBe(404);
  });

  it('cria a conta na volta e abre sessão', async () => {
    const { callback, session } = await entrar({ sub: 'p-1', username: 'Leonardo Aranha' });

    expect(callback.statusCode).toBe(302);
    expect(callback.headers.location).toBe(`${WEB}/perfil?novo=1`);
    expect(session).toBeTruthy();

    const sessao = await app.inject({
      method: 'GET',
      url: '/auth/session',
      cookies: { [SESSION_COOKIE]: session },
    });
    expect(sessao.statusCode).toBe(200);
    expect(sessao.json().user.handle).toBe('leonardo_aranha');
  });

  it('manda quem já é de casa para a home, não para o perfil', async () => {
    await entrar({ sub: 'p-2', username: 'bia' });
    const { callback } = await entrar({ sub: 'p-2', username: 'bia' });

    expect(callback.headers.location).toBe(`${WEB}/`);
  });

  it('devolve o cookie de sessão como httpOnly', async () => {
    const { callback } = await entrar({ sub: 'p-3', username: 'ravi' });
    const cookie = callback.cookies.find((c) => c.name === SESSION_COOKIE);

    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite?.toLowerCase()).toBe('lax');
  });
});

describe('proteção do fluxo', () => {
  it('recusa volta com state trocado', async () => {
    const start = await app.inject({ method: 'GET', url: '/auth/fake/start' });
    const state = start.cookies.find((c) => c.name === 'trendi_oauth_state')?.value ?? '';

    const response = await app.inject({
      method: 'GET',
      url: `/auth/fake/callback?state=outro&code=${encodeFakeCode({ sub: 'invasor' })}`,
      cookies: { trendi_oauth_state: state },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe('estado_invalido');
  });

  it('recusa volta sem o cookie do navegador', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/auth/fake/callback?state=qualquer&code=${encodeFakeCode({ sub: 'invasor' })}`,
    });

    expect(response.statusCode).toBe(400);
  });

  it('leva de volta ao login quando a pessoa cancela no provedor', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/auth/fake/callback?error=access_denied',
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe(`${WEB}/entrar?erro=access_denied`);
  });

  it('não reconhece sessão inventada', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/auth/session',
      cookies: { [SESSION_COOKIE]: 'token-falso' },
    });

    expect(response.statusCode).toBe(401);
  });

  it('não deixa entrar sem sessão', async () => {
    for (const url of ['/auth/session', '/me', '/auth/realtime-ticket']) {
      const method = url === '/me' ? 'PATCH' : url === '/auth/session' ? 'GET' : 'POST';
      const response = await app.inject({ method, url, payload: {} });
      expect(response.statusCode).toBe(401);
    }
  });
});

describe('perfil mínimo', () => {
  it('troca handle e nome', async () => {
    const { session } = await entrar({ sub: 'p-4', username: 'antes' });

    const response = await app.inject({
      method: 'PATCH',
      url: '/me',
      cookies: { [SESSION_COOKIE]: session },
      payload: { handle: 'depois', displayName: 'Nome Novo' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().user).toMatchObject({ handle: 'depois', displayName: 'Nome Novo' });
  });

  it('recusa handle fora da regra', async () => {
    const { session } = await entrar({ sub: 'p-5', username: 'valido' });

    for (const [handle, problema] of [
      ['ab', 'muito_curto'],
      ['Com Maiuscula', 'caracteres_invalidos'],
      ['admin', 'reservado'],
    ]) {
      const response = await app.inject({
        method: 'PATCH',
        url: '/me',
        cookies: { [SESSION_COOKIE]: session },
        payload: { handle },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().problema).toBe(problema);
    }
  });

  it('recusa handle de outra pessoa com 409', async () => {
    const dono = await entrar({ sub: 'p-6', username: 'dono_do_nome' });
    const outro = await entrar({ sub: 'p-7', username: 'outro_qualquer' });

    const perfilDono = await app.inject({
      method: 'GET',
      url: '/auth/session',
      cookies: { [SESSION_COOKIE]: dono.session },
    });

    const response = await app.inject({
      method: 'PATCH',
      url: '/me',
      cookies: { [SESSION_COOKIE]: outro.session },
      payload: { handle: perfilDono.json().user.handle },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error).toBe('handle_em_uso');
  });
});

describe('ticket de tempo real', () => {
  it('sai assinado para quem tem sessão', async () => {
    const { session } = await entrar({ sub: 'p-8', username: 'conectado' });

    const response = await app.inject({
      method: 'POST',
      url: '/auth/realtime-ticket',
      cookies: { [SESSION_COOKIE]: session },
      payload: { duelId: 'd-1' },
    });

    expect(response.statusCode).toBe(200);
    const claims = verifyRealtimeTicket(response.json().ticket, SECRET);
    expect(claims?.duelId).toBe('d-1');
    expect(claims?.userId).toBeTruthy();
  });
});

describe('sair', () => {
  it('encerra a sessão', async () => {
    const { session } = await entrar({ sub: 'p-9', username: 'de_saida' });

    const logout = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      cookies: { [SESSION_COOKIE]: session },
    });
    expect(logout.statusCode).toBe(200);

    const depois = await app.inject({
      method: 'GET',
      url: '/auth/session',
      cookies: { [SESSION_COOKIE]: session },
    });
    expect(depois.statusCode).toBe(401);
  });
});
