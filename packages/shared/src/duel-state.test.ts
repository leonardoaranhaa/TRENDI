import { describe, expect, it } from 'vitest';
import {
  CHOICE_WINDOW_MS,
  InvalidTransitionError,
  MATCH_ACCEPT_MS,
  PREPARATION_MS,
  VOTING_WINDOW_MS,
  applyEvent,
  deadlineFor,
  isPastPointOfNoReturn,
  isTerminal,
  startDuel,
  tick,
  type DuelSnapshot,
  type DuelTransition,
} from './duel-state.js';

const T0 = 1_700_000_000_000;

/** Roda o duelo inteiro só com eventos explícitos, guardando o registro. */
function runFullDuel(executionMs = 60_000): {
  snapshot: DuelSnapshot;
  log: DuelTransition[];
} {
  const log: DuelTransition[] = [];
  let snapshot = startDuel(T0);
  let at = T0;

  const steps = [
    { event: 'match_found' as const },
    { event: 'both_accepted' as const },
    { event: 'choice_closed' as const, options: { executionMs } },
    { event: 'preparation_done' as const },
    { event: 'execution_done' as const },
    { event: 'voting_closed' as const },
  ];

  for (const step of steps) {
    at += 1_000;
    // ACEITE é instantâneo: o timeout de 0ms leva a ESCOLHA antes do próximo evento.
    const due = tick(snapshot, at);
    if (due) {
      log.push(due.transition);
      snapshot = due.snapshot;
    }
    const result = applyEvent(snapshot, step.event, at, step.options ?? {});
    log.push(result.transition);
    snapshot = result.snapshot;
  }

  return { snapshot, log };
}

describe('ciclo de vida', () => {
  it('vai da fila ao resultado', () => {
    const { snapshot, log } = runFullDuel();

    expect(snapshot.state).toBe('result');
    expect(log.map((t) => t.to)).toEqual([
      'matched',
      'accepted',
      'choosing',
      'preparing',
      'running',
      'voting',
      'result',
    ]);
  });

  it('registra toda transição — auditoria é requisito', () => {
    const { log } = runFullDuel();

    for (const transition of log) {
      expect(transition.from).not.toBe(transition.to);
      expect(transition.at).toBeGreaterThanOrEqual(T0);
      expect(typeof transition.abandonment).toBe('boolean');
    }
  });

  it('guarda o tempo escolhido pelo público', () => {
    const { snapshot } = runFullDuel(90_000);
    expect(snapshot.executionMs).toBe(90_000);
  });
});

describe('unidirecionalidade', () => {
  it('não volta de VOTAÇÃO para EXECUÇÃO', () => {
    const voting: DuelSnapshot = { state: 'voting', enteredAt: T0 };

    expect(() => applyEvent(voting, 'preparation_done', T0 + 10)).toThrowError(
      InvalidTransitionError,
    );
    expect(() => applyEvent(voting, 'execution_done', T0 + 10)).toThrowError(InvalidTransitionError);
  });

  it('não aceita evento fora de hora', () => {
    const queued = startDuel(T0);
    expect(() => applyEvent(queued, 'voting_closed', T0 + 10)).toThrowError(InvalidTransitionError);
  });

  it('não sai de estado terminal', () => {
    for (const state of ['result', 'cancelled'] as const) {
      expect(isTerminal(state)).toBe(true);
      expect(() => applyEvent({ state, enteredAt: T0 }, 'cancel', T0 + 10)).toThrowError(
        InvalidTransitionError,
      );
    }
  });
});

describe('timeouts', () => {
  it('todo estado do ciclo tem saída automática, menos fila e resultado', () => {
    const withoutTimeout: DuelSnapshot[] = [
      { state: 'queued', enteredAt: T0 }, // matchmaking decide
      { state: 'result', enteredAt: T0 }, // terminal
    ];
    for (const snapshot of withoutTimeout) expect(deadlineFor(snapshot)).toBeNull();

    const withTimeout: DuelSnapshot[] = [
      { state: 'matched', enteredAt: T0 },
      { state: 'accepted', enteredAt: T0 },
      { state: 'choosing', enteredAt: T0 },
      { state: 'preparing', enteredAt: T0 },
      { state: 'running', enteredAt: T0, executionMs: 60_000 },
      { state: 'voting', enteredAt: T0 },
    ];
    for (const snapshot of withTimeout) expect(deadlineFor(snapshot)).not.toBeNull();
  });

  it('usa as durações do arquivo de regras', () => {
    expect(deadlineFor({ state: 'matched', enteredAt: T0 })).toBe(T0 + MATCH_ACCEPT_MS);
    expect(deadlineFor({ state: 'choosing', enteredAt: T0 })).toBe(T0 + CHOICE_WINDOW_MS);
    expect(deadlineFor({ state: 'preparing', enteredAt: T0 })).toBe(T0 + PREPARATION_MS);
    expect(deadlineFor({ state: 'voting', enteredAt: T0 })).toBe(T0 + VOTING_WINDOW_MS.default);
  });

  it('respeita a janela de votação do duelo, dentro da faixa', () => {
    const snapshot: DuelSnapshot = { state: 'voting', enteredAt: T0, votingWindowMs: 30_000 };
    expect(deadlineFor(snapshot)).toBe(T0 + VOTING_WINDOW_MS.min);
  });

  it('não dispara antes da hora', () => {
    const choosing: DuelSnapshot = { state: 'choosing', enteredAt: T0 };
    expect(tick(choosing, T0 + CHOICE_WINDOW_MS - 1)).toBeNull();
    expect(tick(choosing, T0 + CHOICE_WINDOW_MS)?.snapshot.state).toBe('preparing');
  });

  it('mata o pareamento que ninguém aceitou', () => {
    const matched: DuelSnapshot = { state: 'matched', enteredAt: T0 };
    const result = tick(matched, T0 + MATCH_ACCEPT_MS);

    expect(result?.snapshot.state).toBe('cancelled');
    expect(result?.transition.reason).toBe('pairing_expired');
    // Pareamento expirado não é desistência: ninguém tinha se comprometido.
    expect(result?.transition.abandonment).toBe(false);
  });

  it('usa o tempo escolhido pelo público na EXECUÇÃO', () => {
    const running: DuelSnapshot = { state: 'running', enteredAt: T0, executionMs: 90_000 };
    expect(tick(running, T0 + 89_999)).toBeNull();
    expect(tick(running, T0 + 90_000)?.snapshot.state).toBe('voting');
  });
});

describe('ponto de não retorno', () => {
  it('começa no ACEITE', () => {
    expect(isPastPointOfNoReturn('queued')).toBe(false);
    expect(isPastPointOfNoReturn('matched')).toBe(false);
    expect(isPastPointOfNoReturn('accepted')).toBe(true);
    expect(isPastPointOfNoReturn('running')).toBe(true);
  });

  it('registra desistência quando alguém sai depois do aceite', () => {
    for (const state of ['accepted', 'choosing', 'preparing', 'running'] as const) {
      const result = applyEvent({ state, enteredAt: T0 }, 'abandon', T0 + 5_000, {
        reason: 'creator_left',
      });

      expect(result.snapshot.state).toBe('cancelled');
      expect(result.transition.abandonment).toBe(true);
      expect(result.transition.reason).toBe('creator_left');
    }
  });

  it('não registra desistência antes do aceite', () => {
    const result = applyEvent({ state: 'matched', enteredAt: T0 }, 'cancel', T0 + 5_000);
    expect(result.snapshot.state).toBe('cancelled');
    expect(result.transition.abandonment).toBe(false);
  });

  it('não deixa criador cancelar duelo já em votação', () => {
    // O duelo aconteceu. Quem fecha a aba agora não interrompe a apuração.
    expect(() => applyEvent({ state: 'voting', enteredAt: T0 }, 'abandon', T0 + 1)).toThrowError(
      InvalidTransitionError,
    );
  });
});
