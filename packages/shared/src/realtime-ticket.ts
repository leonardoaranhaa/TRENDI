import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Ticket de entrada no servidor de tempo real.
 *
 * Por que não usar o cookie de sessão: o cliente fica na Vercel e o
 * WebSocket na Fly, em domínios diferentes, e navegador não manda cookie de
 * terceiro para conexão `wss://`. Então quem já tem sessão pede um ticket
 * curto à API e apresenta esse ticket ao conectar.
 *
 * O ticket é assinado, não guardado: o servidor de tempo real confere a
 * assinatura e o prazo sem consultar banco — é o que permite aguentar sala
 * cheia entrando de uma vez.
 *
 * Este arquivo fica fora do `index.ts` de propósito: ele usa `node:crypto`,
 * que não existe no navegador. Importe por `@trendi/shared/realtime-ticket`.
 */

/** Vida curta: é só a travessia entre pedir e conectar. */
export const REALTIME_TICKET_TTL_MS = 60_000;

export interface RealtimeTicketClaims {
  readonly userId: string;
  /** Duelo a que o ticket dá acesso. Sem isso, vale para qualquer sala. */
  readonly duelId?: string | undefined;
}

interface TicketPayload {
  readonly u: string;
  readonly d?: string;
  /** Epoch ms de expiração. */
  readonly e: number;
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function issueRealtimeTicket(
  claims: RealtimeTicketClaims,
  secret: string,
  now = Date.now(),
): { ticket: string; expiresAt: Date } {
  const expiresAt = now + REALTIME_TICKET_TTL_MS;
  const payload: TicketPayload = {
    u: claims.userId,
    ...(claims.duelId === undefined ? {} : { d: claims.duelId }),
    e: expiresAt,
  };

  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return { ticket: `${encoded}.${sign(encoded, secret)}`, expiresAt: new Date(expiresAt) };
}

/**
 * Devolve o que o ticket afirma, ou `null` se ele foi adulterado, venceu, ou
 * simplesmente não tem a nossa cara.
 */
export function verifyRealtimeTicket(
  ticket: string,
  secret: string,
  now = Date.now(),
): RealtimeTicketClaims | null {
  const separator = ticket.lastIndexOf('.');
  if (separator <= 0) return null;

  const encoded = ticket.slice(0, separator);
  const signature = ticket.slice(separator + 1);

  const expected = Buffer.from(sign(encoded, secret), 'utf8');
  const received = Buffer.from(signature, 'utf8');
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;

  let payload: TicketPayload;
  try {
    payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as TicketPayload;
  } catch {
    return null;
  }

  if (typeof payload.u !== 'string' || typeof payload.e !== 'number') return null;
  if (payload.e <= now) return null;

  return { userId: payload.u, duelId: payload.d };
}
