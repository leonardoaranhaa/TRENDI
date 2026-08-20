import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { createRealtimeServer } from './server.js';
import type { ServerMessage } from './server.js';

const PORT = 3902;
let server: ReturnType<typeof createRealtimeServer> | null = null;

afterEach(async () => {
  await new Promise<void>((resolve) => server?.close(() => resolve()) ?? resolve());
  server = null;
});

/** Abre um cliente, manda uma mensagem e devolve a primeira resposta. */
function roundtrip(payload: unknown): Promise<ServerMessage> {
  return new Promise((resolve, reject) => {
    const client = new WebSocket(`ws://localhost:${PORT}`);
    client.on('error', reject);
    client.on('open', () => client.send(JSON.stringify(payload)));
    client.on('message', (raw) => {
      client.close();
      resolve(JSON.parse(String(raw)) as ServerMessage);
    });
  });
}

describe('servidor de tempo real', () => {
  it('responde a entrada na sala com o estado do duelo', async () => {
    server = createRealtimeServer({ port: PORT, duelState: () => 'running' });

    const message = await roundtrip({ type: 'join', duelId: 'd-1', stand: 'general' });
    expect(message).toEqual({ type: 'hello', duelId: 'd-1', state: 'running' });
  });

  it('recusa mensagem malformada sem derrubar a conexão', async () => {
    server = createRealtimeServer({ port: PORT });

    const message = await new Promise<ServerMessage>((resolve, reject) => {
      const client = new WebSocket(`ws://localhost:${PORT}`);
      client.on('error', reject);
      client.on('open', () => client.send('não é json'));
      client.on('message', (raw) => {
        client.close();
        resolve(JSON.parse(String(raw)) as ServerMessage);
      });
    });

    expect(message).toEqual({ type: 'error', reason: 'malformed_message' });
  });
});
