import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPrismaClient, type PrismaClient } from '@trendi/db';
import { startTestDatabase, type TestDatabase } from '@trendi/db/testing';
import { CROSS_VOTE_WEIGHTS } from '@trendi/shared';
import { loadConfig } from './config.js';
import { buildServer } from './server.js';

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

function server() {
  return buildServer({ prisma, config: loadConfig({ NODE_ENV: 'test' }), logger: false });
}

describe('API', () => {
  it('responde /health', async () => {
    const app = server();
    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok', service: 'api' });
    await app.close();
  });

  it('publica os pesos do voto cruzado vindos de @trendi/shared', async () => {
    const app = server();
    const response = await app.inject({ method: 'GET', url: '/rules' });

    expect(response.json().crossVote.weights).toEqual(CROSS_VOTE_WEIGHTS);
    await app.close();
  });

  it('não oferece provedor nenhum sem credencial configurada', async () => {
    const app = server();
    const response = await app.inject({ method: 'GET', url: '/auth/providers' });

    expect(response.json()).toEqual({ providers: [] });
    await app.close();
  });

  it('nunca liga o provedor falso em produção', () => {
    const config = loadConfig({
      NODE_ENV: 'production',
      AUTH_FAKE_PROVIDER: '1',
      REALTIME_TICKET_SECRET: 'x',
    });

    expect(config.fakeProviderEnabled).toBe(false);
  });

  it('exige segredo de ticket em produção', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrowError(/REALTIME_TICKET_SECRET/);
  });
});
