import { describe, expect, it } from 'vitest';
import { CROSS_VOTE_WEIGHTS } from '@trendi/shared';
import { buildServer } from './server.js';

describe('API', () => {
  it('responde /health', async () => {
    const app = buildServer();
    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok', service: 'api' });
    await app.close();
  });

  it('publica os pesos do voto cruzado vindos de @trendi/shared', async () => {
    const app = buildServer();
    const response = await app.inject({ method: 'GET', url: '/rules' });

    expect(response.json().crossVote.weights).toEqual(CROSS_VOTE_WEIGHTS);
    await app.close();
  });
});
