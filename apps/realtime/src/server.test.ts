import { randomUUID } from 'node:crypto';
import { WebSocket } from 'ws';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createPrismaClient, type PrismaClient } from '@trendi/db';
import { startTestDatabase, type TestDatabase } from '@trendi/db/testing';
import { issueRealtimeTicket } from '@trendi/shared/realtime-ticket';
import { HISTORY_SIZE, MAX_MESSAGE_LENGTH, type ServerMessage } from '@trendi/shared';
import { createRealtimeServer, type RealtimeServer } from './server.js';

const SECRET = 'segredo-de-teste';
const PORT = 3910;

let database: TestDatabase;
let prisma: PrismaClient;
let server: RealtimeServer;
let duelId: string;
let leo: { id: string; handle: string };
let bia: { id: string; handle: string };

beforeAll(async () => {
  database = await startTestDatabase();
  prisma = createPrismaClient(database.connectionString);

  leo = await criarUsuario('leo');
  bia = await criarUsuario('bia');
  duelId = randomUUID();
  await prisma.duel.create({
    data: { id: duelId, creatorA: leo.id, creatorB: bia.id, state: 'running' },
  });

  server = createRealtimeServer({
    port: PORT,
    prisma,
    ticketSecret: SECRET,
    // Rajada pequena para o teste de limite não precisar de cem mensagens.
    rateLimit: { burst: 3, refillPerSecond: 0.5 },
    heartbeatMs: 0,
  });
});

afterAll(async () => {
  await server.close();
  await prisma.$disconnect();
  await database.close();
});

afterEach(async () => {
  await prisma.message.deleteMany({ where: { duelId } });
});

async function criarUsuario(handle: string) {
  const user = await prisma.user.create({
    data: { id: randomUUID(), handle, email: `${handle}@trendi.test` },
  });
  return { id: user.id, handle: user.handle };
}

/** Cliente de teste que guarda tudo que o servidor mandou. */
class Cliente {
  readonly recebidas: ServerMessage[] = [];
  private constructor(private readonly socket: WebSocket) {}

  static async conectar(ticket: string): Promise<Cliente> {
    const socket = new WebSocket(`ws://127.0.0.1:${PORT}?ticket=${encodeURIComponent(ticket)}`);
    const cliente = new Cliente(socket);

    socket.on('message', (raw) => cliente.recebidas.push(JSON.parse(String(raw)) as ServerMessage));

    await new Promise<void>((resolve, reject) => {
      socket.on('open', () => resolve());
      socket.on('error', reject);
      socket.on('close', (code) => reject(new Error(`fechou com ${code}`)));
    });
    return cliente;
  }

  /**
   * Conecta esperando ser barrado, e devolve o código de fechamento.
   *
   * O handshake completa antes de o servidor conferir o ticket, então quem
   * não passa não vê "erro de conexão": vê a porta fechando na cara, com
   * código próprio.
   */
  static recusa(ticket: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(`ws://127.0.0.1:${PORT}?ticket=${encodeURIComponent(ticket)}`);
      const prazo = setTimeout(() => reject(new Error('a conexão não foi recusada')), 2_000);

      socket.on('close', (code) => {
        clearTimeout(prazo);
        resolve(code);
      });
      // Fechar durante o handshake às vezes chega como erro de socket; o que
      // interessa é o código do close.
      socket.on('error', () => undefined);
    });
  }

  envia(message: unknown): void {
    this.socket.send(JSON.stringify(message));
  }

  /** Espera a próxima mensagem de um tipo, com prazo curto. */
  async espera(type: ServerMessage['type'], timeoutMs = 2_000): Promise<ServerMessage> {
    const limite = Date.now() + timeoutMs;
    for (;;) {
      const encontrada = this.recebidas.find((m) => m.type === type);
      if (encontrada !== undefined) {
        this.recebidas.splice(this.recebidas.indexOf(encontrada), 1);
        return encontrada;
      }
      if (Date.now() > limite) throw new Error(`esperei "${type}" e não veio`);
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  fecha(): void {
    this.socket.close();
  }
}

function ticketDe(userId: string, duelo?: string) {
  return issueRealtimeTicket(duelo === undefined ? { userId } : { userId, duelId: duelo }, SECRET)
    .ticket;
}

async function entrar(userId: string, stand?: string) {
  const cliente = await Cliente.conectar(ticketDe(userId));
  cliente.envia({ type: 'join', duelId, ...(stand === undefined ? {} : { stand }) });
  await cliente.espera('hello');
  await cliente.espera('history');
  return cliente;
}

describe('entrada na sala', () => {
  it('recusa quem não tem ticket', async () => {
    expect(await Cliente.recusa('ticket-inventado')).toBe(4401);
  });

  it('recusa ticket assinado com outro segredo', async () => {
    const outro = issueRealtimeTicket({ userId: leo.id }, 'outro-segredo').ticket;
    expect(await Cliente.recusa(outro)).toBe(4401);
  });

  it('recusa ticket vencido', async () => {
    const vencido = issueRealtimeTicket({ userId: leo.id }, SECRET, Date.now() - 120_000).ticket;
    expect(await Cliente.recusa(vencido)).toBe(4401);
  });

  it('entra e recebe estado do duelo e histórico', async () => {
    const cliente = await Cliente.conectar(ticketDe(leo.id));
    cliente.envia({ type: 'join', duelId, stand: 'a' });

    const hello = await cliente.espera('hello');
    expect(hello).toMatchObject({
      type: 'hello',
      duelId,
      state: 'running',
      you: { userId: leo.id, handle: 'leo', stand: 'a' },
    });

    expect(await cliente.espera('history')).toMatchObject({ type: 'history', messages: [] });
    cliente.fecha();
  });

  it('registra presença e mantém a arquibancada ao reconectar', async () => {
    const primeira = await entrar(bia.id, 'b');
    primeira.fecha();

    // Reconectar pedindo outro lado não muda: a arquibancada trava.
    const segunda = await Cliente.conectar(ticketDe(bia.id));
    segunda.envia({ type: 'join', duelId, stand: 'a' });
    const hello = await segunda.espera('hello');

    expect((hello as { you: { stand: string } }).you.stand).toBe('b');
    segunda.fecha();
  });

  it('recusa ticket emitido para outro duelo', async () => {
    const cliente = await Cliente.conectar(ticketDe(leo.id, randomUUID()));
    cliente.envia({ type: 'join', duelId });

    expect(await cliente.espera('error')).toMatchObject({ reason: 'ticket_duel_mismatch' });
    cliente.fecha();
  });

  it('recusa duelo que não existe', async () => {
    const cliente = await Cliente.conectar(ticketDe(leo.id));
    cliente.envia({ type: 'join', duelId: randomUUID() });

    expect(await cliente.espera('error')).toMatchObject({ reason: 'duel_not_found' });
    cliente.fecha();
  });

  it('recusa entrar duas vezes na mesma conexão', async () => {
    const cliente = await entrar(leo.id);
    cliente.envia({ type: 'join', duelId });

    expect(await cliente.espera('error')).toMatchObject({ reason: 'already_joined' });
    cliente.fecha();
  });
});

describe('chat', () => {
  it('entrega a mensagem para a sala inteira', async () => {
    const escritor = await entrar(leo.id, 'a');
    const plateia = await entrar(bia.id, 'b');

    escritor.envia({ type: 'message', body: 'vai começar' });

    for (const cliente of [escritor, plateia]) {
      const recebida = await cliente.espera('message');
      expect(recebida).toMatchObject({
        type: 'message',
        message: { handle: 'leo', stand: 'a', body: 'vai começar' },
      });
    }

    escritor.fecha();
    plateia.fecha();
  });

  it('guarda a mensagem e devolve como histórico para quem chega depois', async () => {
    const primeiro = await entrar(leo.id);
    primeiro.envia({ type: 'message', body: 'cheguei primeiro' });
    await primeiro.espera('message');
    primeiro.fecha();

    const segundo = await Cliente.conectar(ticketDe(bia.id));
    segundo.envia({ type: 'join', duelId });
    await segundo.espera('hello');
    const history = (await segundo.espera('history')) as { messages: { body: string }[] };

    expect(history.messages.map((m) => m.body)).toEqual(['cheguei primeiro']);
    segundo.fecha();
  });

  it('devolve no máximo o histórico curto, do mais antigo para o mais novo', async () => {
    await prisma.message.createMany({
      data: Array.from({ length: HISTORY_SIZE + 5 }, (_, indice) => ({
        id: randomUUID(),
        duelId,
        userId: leo.id,
        stand: 'general',
        body: `mensagem ${indice}`,
        createdAt: new Date(Date.now() + indice * 1000),
      })),
    });

    const cliente = await Cliente.conectar(ticketDe(bia.id));
    cliente.envia({ type: 'join', duelId });
    await cliente.espera('hello');
    const history = (await cliente.espera('history')) as { messages: { body: string }[] };

    expect(history.messages).toHaveLength(HISTORY_SIZE);
    expect(history.messages[0]?.body).toBe('mensagem 5');
    expect(history.messages.at(-1)?.body).toBe(`mensagem ${HISTORY_SIZE + 4}`);
    cliente.fecha();
  });

  it('não deixa escrever sem entrar na sala', async () => {
    const cliente = await Cliente.conectar(ticketDe(leo.id));
    cliente.envia({ type: 'message', body: 'oi' });

    expect(await cliente.espera('error')).toMatchObject({ reason: 'not_in_room' });
    cliente.fecha();
  });

  it('recusa mensagem vazia e mensagem grande demais', async () => {
    const cliente = await entrar(leo.id);

    cliente.envia({ type: 'message', body: '   ' });
    expect(await cliente.espera('error')).toMatchObject({ reason: 'empty_message' });

    cliente.envia({ type: 'message', body: 'a'.repeat(MAX_MESSAGE_LENGTH + 1) });
    expect(await cliente.espera('error')).toMatchObject({ reason: 'message_too_long' });

    cliente.fecha();
  });

  it('corta rajada de uma conta só', async () => {
    const cliente = await entrar(leo.id);

    for (let i = 0; i < 6; i += 1) cliente.envia({ type: 'message', body: `spam ${i}` });

    expect(await cliente.espera('error')).toMatchObject({ reason: 'rate_limited' });
    // O que passou antes do limite continua valendo: não se perde a torcida.
    expect(await prisma.message.count({ where: { duelId } })).toBeGreaterThan(0);
    cliente.fecha();
  });

  it('não engasga com lixo', async () => {
    const cliente = await entrar(leo.id);

    cliente.envia('nem json é');
    expect(await cliente.espera('error')).toMatchObject({ reason: 'malformed_message' });

    cliente.envia({ type: 'inventado' });
    expect(await cliente.espera('error')).toMatchObject({ reason: 'malformed_message' });

    // A conexão sobreviveu a tudo isso.
    cliente.envia({ type: 'ping' });
    expect(await cliente.espera('pong')).toMatchObject({ type: 'pong' });
    cliente.fecha();
  });
});

describe('estado do duelo', () => {
  it('publica mudança de estado para a sala', async () => {
    const cliente = await entrar(leo.id);

    server.publishState(duelId, 'voting');

    expect(await cliente.espera('state')).toMatchObject({ type: 'state', state: 'voting' });
    cliente.fecha();
  });
});
