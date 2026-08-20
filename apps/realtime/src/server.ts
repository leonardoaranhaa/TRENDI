import { WebSocketServer, type WebSocket } from 'ws';
import type { DuelState, Stand } from '@trendi/shared';

/**
 * Esqueleto do servidor de tempo real. Fica separado da API de propósito:
 * carga de chat não pode derrubar login (02-arquitetura/stack.md).
 *
 * O que entra aqui depois: chat único em C-07, três chats com escrita
 * restrita em C-11, barulhômetro em C-13.
 */

/** Mensagens que o servidor manda para o cliente. */
export type ServerMessage =
  | { type: 'hello'; duelId: string; state: DuelState }
  | { type: 'state'; duelId: string; state: DuelState }
  | { type: 'error'; reason: string };

/** Mensagens que o cliente manda para o servidor. */
export type ClientMessage = { type: 'join'; duelId: string; stand: Stand } | { type: 'ping' };

export interface RealtimeServerOptions {
  readonly port: number;
  /** De onde vem o estado atual do duelo. Em C-07 isso vem do serviço de Duelo. */
  readonly duelState?: (duelId: string) => DuelState;
}

export function createRealtimeServer(options: RealtimeServerOptions): WebSocketServer {
  const currentState = options.duelState ?? (() => 'queued' as const);
  const server = new WebSocketServer({ port: options.port });

  server.on('connection', (socket: WebSocket) => {
    socket.on('message', (raw) => {
      let message: ClientMessage;
      try {
        message = JSON.parse(String(raw)) as ClientMessage;
      } catch {
        send(socket, { type: 'error', reason: 'malformed_message' });
        return;
      }

      if (message.type === 'join') {
        send(socket, {
          type: 'hello',
          duelId: message.duelId,
          state: currentState(message.duelId),
        });
        return;
      }

      if (message.type !== 'ping') send(socket, { type: 'error', reason: 'unknown_message' });
    });
  });

  return server;
}

function send(socket: WebSocket, message: ServerMessage): void {
  socket.send(JSON.stringify(message));
}
