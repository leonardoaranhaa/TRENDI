import { describe, expect, it } from 'vitest';
import {
  REALTIME_TICKET_TTL_MS,
  issueRealtimeTicket,
  verifyRealtimeTicket,
} from './realtime-ticket.js';

const SECRET = 'segredo-de-teste';
const AGORA = 1_700_000_000_000;

describe('ticket de tempo real', () => {
  it('vai e volta', () => {
    const { ticket } = issueRealtimeTicket({ userId: 'u-1', duelId: 'd-1' }, SECRET, AGORA);

    expect(verifyRealtimeTicket(ticket, SECRET, AGORA + 1_000)).toEqual({
      userId: 'u-1',
      duelId: 'd-1',
    });
  });

  it('vale para qualquer sala quando não nomeia duelo', () => {
    const { ticket } = issueRealtimeTicket({ userId: 'u-1' }, SECRET, AGORA);

    expect(verifyRealtimeTicket(ticket, SECRET, AGORA)?.duelId).toBeUndefined();
  });

  it('vence', () => {
    const { ticket, expiresAt } = issueRealtimeTicket({ userId: 'u-1' }, SECRET, AGORA);

    expect(expiresAt.getTime()).toBe(AGORA + REALTIME_TICKET_TTL_MS);
    expect(verifyRealtimeTicket(ticket, SECRET, AGORA + REALTIME_TICKET_TTL_MS)).toBeNull();
  });

  it('não aceita assinatura de outro segredo', () => {
    const { ticket } = issueRealtimeTicket({ userId: 'u-1' }, 'outro-segredo', AGORA);

    expect(verifyRealtimeTicket(ticket, SECRET, AGORA)).toBeNull();
  });

  it('não aceita payload trocado', () => {
    const { ticket } = issueRealtimeTicket({ userId: 'u-1' }, SECRET, AGORA);
    const [, assinatura] = ticket.split('.');
    const forjado = Buffer.from(
      JSON.stringify({ u: 'u-2', e: AGORA + 60_000 }),
      'utf8',
    ).toString('base64url');

    expect(verifyRealtimeTicket(`${forjado}.${assinatura}`, SECRET, AGORA)).toBeNull();
  });

  it('não engasga com lixo', () => {
    for (const lixo of ['', '.', 'sem-ponto', 'a.b', '....']) {
      expect(verifyRealtimeTicket(lixo, SECRET, AGORA)).toBeNull();
    }
  });
});
