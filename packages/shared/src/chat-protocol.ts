import type { DuelState } from './duel-state.js';
import type { Stand } from './domain.js';

/**
 * O que cliente e servidor trocam no chat do duelo (C-07).
 *
 * Mora em `shared` porque é contrato de fio entre dois lados: o servidor de
 * tempo real e o estádio no navegador (C-06). Tipo de fio que só um lado
 * enxerga é como divergência começa.
 *
 * Hoje é um chat só por duelo. A mensagem já carrega a arquibancada de quem
 * escreveu porque a Fase 2 divide isso em três salas com escrita restrita
 * (C-11) — e é melhor a estrutura já nascer certa do que migrar histórico
 * depois.
 */

export interface ChatMessage {
  readonly id: string;
  readonly duelId: string;
  readonly userId: string;
  readonly handle: string;
  readonly stand: Stand;
  readonly body: string;
  readonly createdAt: string;
}

export type ClientMessage =
  | { type: 'join'; duelId: string; stand?: Stand }
  | { type: 'message'; body: string }
  | { type: 'ping' };

export type ServerMessage =
  | {
      type: 'hello';
      duelId: string;
      state: DuelState;
      you: { userId: string; handle: string; stand: Stand };
    }
  | { type: 'history'; duelId: string; messages: ChatMessage[] }
  | { type: 'message'; message: ChatMessage }
  | { type: 'state'; duelId: string; state: DuelState }
  | { type: 'pong' }
  | { type: 'error'; reason: ErrorReason };

export type ErrorReason =
  | 'malformed_message'
  | 'unknown_message'
  | 'unauthenticated'
  | 'not_in_room'
  | 'already_joined'
  | 'duel_not_found'
  | 'ticket_duel_mismatch'
  | 'empty_message'
  | 'message_too_long'
  | 'rate_limited';

/** Tamanho máximo de uma mensagem de chat. */
export const MAX_MESSAGE_LENGTH = 300;

/** Quantas mensagens recentes quem entra recebe de uma vez. */
export const HISTORY_SIZE = 30;

export function parseClientMessage(raw: string): ClientMessage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null) return null;
  const message = parsed as Record<string, unknown>;

  if (message['type'] === 'ping') return { type: 'ping' };

  if (message['type'] === 'join') {
    const duelId = message['duelId'];
    if (typeof duelId !== 'string' || duelId === '') return null;
    const stand = message['stand'];
    if (stand !== undefined && stand !== 'a' && stand !== 'b' && stand !== 'general') return null;
    return stand === undefined ? { type: 'join', duelId } : { type: 'join', duelId, stand };
  }

  if (message['type'] === 'message') {
    const body = message['body'];
    if (typeof body !== 'string') return null;
    return { type: 'message', body };
  }

  return null;
}
