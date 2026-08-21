import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import type { PrismaClient } from '@trendi/db';
import type { DuelState, Stand } from '@trendi/shared';
import { verifyRealtimeTicket } from '@trendi/shared/realtime-ticket';
import {
  HISTORY_SIZE,
  MAX_MESSAGE_LENGTH,
  parseClientMessage,
  type ChatMessage,
} from './protocol.js';
import { CHAT_RATE_LIMIT, RateLimiter, type RateLimitOptions } from './rate-limit.js';
import { Rooms, send } from './rooms.js';

/**
 * Servidor de tempo real: o chat do duelo (C-07).
 *
 * Fica separado da API de propósito — carga de chat não pode derrubar login
 * (02-arquitetura/stack.md).
 *
 * Entra quem apresenta um ticket assinado pela API (decisão D-16). Cookie não
 * serve aqui: o cliente está na Vercel e isto na Fly, e navegador não manda
 * cookie de terceiro em conexão `wss://`.
 *
 * O que ainda não é daqui: os três chats com escrita restrita (C-11),
 * barulhômetro (C-13) e moderação em camadas (C-22). A mensagem já guarda a
 * arquibancada de quem escreveu para essas três chegarem sem migração.
 */

export interface RealtimeServerOptions {
  readonly port: number;
  readonly prisma: PrismaClient;
  /** O mesmo segredo que a API usa para assinar o ticket. */
  readonly ticketSecret: string;
  readonly rateLimit?: RateLimitOptions;
  /** Intervalo do ping que derruba conexão morta. 0 desliga. */
  readonly heartbeatMs?: number;
  readonly log?: (event: Record<string, unknown>) => void;
}

const UNAUTHENTICATED = 4401;
const DEFAULT_HEARTBEAT_MS = 30_000;

export interface RealtimeServer {
  readonly rooms: Rooms;
  /** Avisa a sala que o duelo mudou de estado. Quem chama é o serviço de Duelo. */
  publishState(duelId: string, state: DuelState): void;
  close(): Promise<void>;
}

export function createRealtimeServer(options: RealtimeServerOptions): RealtimeServer {
  const { prisma, ticketSecret } = options;
  const rooms = new Rooms();
  const limiter = new RateLimiter(options.rateLimit ?? CHAT_RATE_LIMIT);
  const log = options.log ?? (() => undefined);
  const server = new WebSocketServer({ port: options.port });

  /** Conexões que responderam ao último ping. */
  const alive = new WeakSet<WebSocket>();

  server.on('connection', (socket: WebSocket, request: IncomingMessage) => {
    const claims = authenticate(request, ticketSecret);
    if (claims === null) {
      send(socket, { type: 'error', reason: 'unauthenticated' });
      socket.close(UNAUTHENTICATED, 'ticket inválido');
      return;
    }

    alive.add(socket);
    socket.on('pong', () => alive.add(socket));

    socket.on('message', (raw) => {
      void handle(socket, claims, String(raw));
    });

    socket.on('close', () => {
      const member = rooms.leave(socket);
      if (member !== undefined) log({ event: 'saiu', duelId: member.duelId, userId: member.userId });
    });
  });

  async function handle(
    socket: WebSocket,
    claims: { userId: string; duelId?: string | undefined },
    raw: string,
  ): Promise<void> {
    const message = parseClientMessage(raw);
    if (message === null) {
      send(socket, { type: 'error', reason: 'malformed_message' });
      return;
    }

    if (message.type === 'ping') {
      send(socket, { type: 'pong' });
      return;
    }

    if (message.type === 'join') {
      await join(socket, claims, message.duelId, message.stand ?? 'general');
      return;
    }

    await postMessage(socket, message.body);
  }

  async function join(
    socket: WebSocket,
    claims: { userId: string; duelId?: string | undefined },
    duelId: string,
    stand: Stand,
  ): Promise<void> {
    if (rooms.memberOf(socket) !== undefined) {
      send(socket, { type: 'error', reason: 'already_joined' });
      return;
    }
    // Ticket emitido para um duelo específico não abre a porta de outro.
    if (claims.duelId !== undefined && claims.duelId !== duelId) {
      send(socket, { type: 'error', reason: 'ticket_duel_mismatch' });
      return;
    }

    const [duel, user] = await Promise.all([
      prisma.duel.findUnique({ where: { id: duelId } }),
      prisma.user.findUnique({ where: { id: claims.userId } }),
    ]);

    if (duel === null || user === null) {
      send(socket, { type: 'error', reason: 'duel_not_found' });
      return;
    }

    // A arquibancada trava quando a votação abre (regras do duelo, §7): daí
    // o `update: {}` — quem já estava presente não muda de lado ao reconectar.
    const presence = await prisma.attendance.upsert({
      where: { duelId_userId: { duelId, userId: user.id } },
      create: { duelId, userId: user.id, stand },
      update: {},
    });

    rooms.join({
      socket,
      duelId,
      userId: user.id,
      handle: user.handle,
      stand: presence.stand as Stand,
    });

    send(socket, {
      type: 'hello',
      duelId,
      state: duel.state as DuelState,
      you: { userId: user.id, handle: user.handle, stand: presence.stand as Stand },
    });

    send(socket, { type: 'history', duelId, messages: await recentMessages(duelId) });
    log({ event: 'entrou', duelId, userId: user.id, stand: presence.stand });
  }

  async function postMessage(socket: WebSocket, body: string): Promise<void> {
    const member = rooms.memberOf(socket);
    if (member === undefined) {
      send(socket, { type: 'error', reason: 'not_in_room' });
      return;
    }

    const texto = body.trim();
    if (texto === '') {
      send(socket, { type: 'error', reason: 'empty_message' });
      return;
    }
    if (texto.length > MAX_MESSAGE_LENGTH) {
      send(socket, { type: 'error', reason: 'message_too_long' });
      return;
    }
    if (!limiter.take(member.userId)) {
      send(socket, { type: 'error', reason: 'rate_limited' });
      return;
    }

    // Moderação em camadas é C-22. Até lá a mensagem entra aprovada, e o
    // campo já existe para a fila de revisão não exigir migração.
    const registro = await prisma.message.create({
      data: {
        id: randomUUID(),
        duelId: member.duelId,
        userId: member.userId,
        stand: member.stand,
        body: texto,
      },
    });

    const message: ChatMessage = {
      id: registro.id,
      duelId: registro.duelId,
      userId: registro.userId,
      handle: member.handle,
      stand: member.stand,
      body: registro.body,
      createdAt: registro.createdAt.toISOString(),
    };

    rooms.broadcast(member.duelId, { type: 'message', message });
  }

  /** As últimas mensagens do duelo, da mais antiga para a mais nova. */
  async function recentMessages(duelId: string): Promise<ChatMessage[]> {
    const registros = await prisma.message.findMany({
      where: { duelId, moderationStatus: 'approved' },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_SIZE,
      include: { user: { select: { handle: true } } },
    });

    return registros.reverse().map((registro) => ({
      id: registro.id,
      duelId: registro.duelId,
      userId: registro.userId,
      handle: registro.user.handle,
      stand: registro.stand as Stand,
      body: registro.body,
      createdAt: registro.createdAt.toISOString(),
    }));
  }

  function publishState(duelId: string, state: DuelState): void {
    rooms.broadcast(duelId, { type: 'state', duelId, state });
  }

  const heartbeat = options.heartbeatMs ?? DEFAULT_HEARTBEAT_MS;
  const timer =
    heartbeat > 0
      ? setInterval(() => {
          for (const socket of server.clients) {
            // Conexão que não respondeu ao ping anterior morreu sem avisar:
            // sem isto, a sala fica cheia de fantasma.
            if (!alive.has(socket)) {
              socket.terminate();
              continue;
            }
            alive.delete(socket);
            socket.ping();
          }
          limiter.prune();
        }, heartbeat)
      : null;
  timer?.unref();

  return {
    rooms,
    publishState,
    async close() {
      if (timer !== null) clearInterval(timer);
      for (const socket of server.clients) socket.terminate();
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error === undefined ? resolve() : reject(error)));
      });
    },
  };
}

/** Lê e confere o ticket da URL da conexão. */
function authenticate(
  request: IncomingMessage,
  secret: string,
): { userId: string; duelId?: string | undefined } | null {
  const url = new URL(request.url ?? '/', 'http://localhost');
  const ticket = url.searchParams.get('ticket');
  if (ticket === null || ticket === '') return null;
  return verifyRealtimeTicket(ticket, secret);
}
