/**
 * Máquina de estados do duelo — o coração do sistema.
 *
 * Especificação: 01-conceito/regras-do-duelo.md §1 e 02-arquitetura/servicos.md.
 * Regras que este arquivo existe para garantir (02-arquitetura/convencoes.md):
 *
 *   - transições são unidirecionais: não se volta de VOTAÇÃO para EXECUÇÃO;
 *   - todo estado não-terminal tem timeout com transição automática — estado
 *     travado sem timeout é duelo fantasma;
 *   - toda transição vira registro. Auditoria é requisito, não luxo.
 *
 * Aqui só mora a regra. Persistir o registro em `duel_transitions` é
 * trabalho do serviço de Duelo.
 */

/** FILA → PAREADO → ACEITE → ESCOLHA → PREPARO → EXECUÇÃO → VOTAÇÃO → RESULTADO */
export type DuelState =
  | 'queued'
  | 'matched'
  | 'accepted'
  | 'choosing'
  | 'preparing'
  | 'running'
  | 'voting'
  | 'result'
  | 'cancelled';

export type DuelEvent =
  | 'match_found'
  | 'both_accepted'
  | 'choice_closed'
  | 'preparation_done'
  | 'execution_done'
  | 'voting_closed'
  | 'abandon'
  | 'cancel';

/** Ordem do ciclo de vida. `cancelled` fica fora: é saída, não etapa. */
export const DUEL_LIFECYCLE: readonly DuelState[] = [
  'queued',
  'matched',
  'accepted',
  'choosing',
  'preparing',
  'running',
  'voting',
  'result',
];

/**
 * Ponto de não retorno. Sair a partir daqui é desistência e aciona
 * penalidade (01-conceito/regras-do-duelo.md §5).
 */
export const POINT_OF_NO_RETURN: DuelState = 'accepted';

/** Tempo para os dois criadores aceitarem o pareamento. */
export const MATCH_ACCEPT_MS = 60_000;
/** Janela em que o público escolhe desafio e tempo. */
export const CHOICE_WINDOW_MS = 30_000;
/** Contagem regressiva com as regras na tela. */
export const PREPARATION_MS = 15_000;
/** Faixa permitida da janela de votação. O padrão é o teto. */
export const VOTING_WINDOW_MS = { min: 30_000, max: 45_000, default: 45_000 } as const;

interface StateRule {
  /** Duração fixa até o timeout. `null` = variável ou terminal. */
  readonly timeoutMs: number | null;
  /** Para onde o timeout leva, e com que motivo no registro. */
  readonly onTimeout: { readonly to: DuelState; readonly reason: string } | null;
  readonly on: Partial<Record<DuelEvent, DuelState>>;
}

const FLOW: Record<DuelState, StateRule> = {
  queued: {
    timeoutMs: null, // espera na fila é variável; matchmaking decide (C-16)
    onTimeout: null,
    on: { match_found: 'matched', cancel: 'cancelled' },
  },
  matched: {
    timeoutMs: MATCH_ACCEPT_MS,
    // Ninguém aceitou a tempo: o pareamento morre. Quem quiser duelar volta
    // para a fila num duelo novo — a máquina nunca anda para trás.
    onTimeout: { to: 'cancelled', reason: 'pairing_expired' },
    on: { both_accepted: 'accepted', cancel: 'cancelled' },
  },
  accepted: {
    // "Instantâneo" no arquivo de regras. Existe como estado próprio porque é
    // o ponto de não retorno, e ele precisa aparecer na auditoria.
    timeoutMs: 0,
    onTimeout: { to: 'choosing', reason: 'commitment_locked' },
    on: { abandon: 'cancelled' },
  },
  choosing: {
    timeoutMs: CHOICE_WINDOW_MS,
    onTimeout: { to: 'preparing', reason: 'choice_window_closed' },
    on: { choice_closed: 'preparing', abandon: 'cancelled' },
  },
  preparing: {
    timeoutMs: PREPARATION_MS,
    onTimeout: { to: 'running', reason: 'countdown_finished' },
    on: { preparation_done: 'running', abandon: 'cancelled' },
  },
  running: {
    timeoutMs: null, // definido pelo público na ESCOLHA — ver executionMs
    onTimeout: { to: 'voting', reason: 'execution_time_over' },
    on: { execution_done: 'voting', abandon: 'cancelled' },
  },
  voting: {
    timeoutMs: null, // janela do duelo, dentro de VOTING_WINDOW_MS
    onTimeout: { to: 'result', reason: 'voting_window_closed' },
    // O duelo já aconteceu: criador que sai agora não cancela votação.
    on: { voting_closed: 'result' },
  },
  result: { timeoutMs: null, onTimeout: null, on: {} },
  cancelled: { timeoutMs: null, onTimeout: null, on: {} },
};

export interface DuelSnapshot {
  readonly state: DuelState;
  /** Quando entrou no estado atual, em epoch ms. */
  readonly enteredAt: number;
  /** Duração da EXECUÇÃO escolhida pelo público, em ms. */
  readonly executionMs?: number;
  /** Janela de votação deste duelo, em ms. Padrão: VOTING_WINDOW_MS.default. */
  readonly votingWindowMs?: number;
}

/** Registro de auditoria de uma transição. Uma linha em `duel_transitions`. */
export interface DuelTransition {
  readonly from: DuelState;
  readonly to: DuelState;
  readonly event: DuelEvent | 'timeout';
  readonly at: number;
  /** Registrou desistência: saída depois do ponto de não retorno. */
  readonly abandonment: boolean;
  readonly reason?: string;
}

export class InvalidTransitionError extends Error {
  constructor(
    readonly from: DuelState,
    readonly event: DuelEvent,
  ) {
    super(`transição inválida: evento "${event}" não é aceito no estado "${from}"`);
    this.name = 'InvalidTransitionError';
  }
}

export function isTerminal(state: DuelState): boolean {
  return state === 'result' || state === 'cancelled';
}

/** Verdadeiro a partir do ACEITE: sair daqui em diante é desistência. */
export function isPastPointOfNoReturn(state: DuelState): boolean {
  const index = DUEL_LIFECYCLE.indexOf(state);
  return index >= DUEL_LIFECYCLE.indexOf(POINT_OF_NO_RETURN);
}

/** Duração do estado atual, considerando o que o duelo definiu em tempo real. */
export function stateDurationMs(snapshot: DuelSnapshot): number | null {
  if (snapshot.state === 'running') return snapshot.executionMs ?? null;
  if (snapshot.state === 'voting') return snapshot.votingWindowMs ?? VOTING_WINDOW_MS.default;
  return FLOW[snapshot.state].timeoutMs;
}

/** Instante em que o timeout do estado atual vence. `null` se não há. */
export function deadlineFor(snapshot: DuelSnapshot): number | null {
  const duration = stateDurationMs(snapshot);
  return duration === null ? null : snapshot.enteredAt + duration;
}

export function isTimedOut(snapshot: DuelSnapshot, now: number): boolean {
  const deadline = deadlineFor(snapshot);
  return deadline !== null && now >= deadline;
}

export interface TransitionResult {
  readonly snapshot: DuelSnapshot;
  readonly transition: DuelTransition;
}

function move(
  snapshot: DuelSnapshot,
  to: DuelState,
  event: DuelEvent | 'timeout',
  at: number,
  reason: string | undefined,
): TransitionResult {
  const abandonment =
    to === 'cancelled' && event === 'abandon' && isPastPointOfNoReturn(snapshot.state);

  return {
    snapshot: { ...snapshot, state: to, enteredAt: at },
    transition: {
      from: snapshot.state,
      to,
      event,
      at,
      abandonment,
      ...(reason === undefined ? {} : { reason }),
    },
  };
}

/**
 * Aplica um evento explícito.
 *
 * @throws InvalidTransitionError quando o evento não é aceito no estado —
 * inclusive nas tentativas de andar para trás, que a tabela não prevê.
 */
export function applyEvent(
  snapshot: DuelSnapshot,
  event: DuelEvent,
  at: number,
  options: { readonly reason?: string; readonly executionMs?: number } = {},
): TransitionResult {
  const to = FLOW[snapshot.state].on[event];
  if (to === undefined) throw new InvalidTransitionError(snapshot.state, event);

  const base =
    options.executionMs === undefined ? snapshot : { ...snapshot, executionMs: options.executionMs };
  return move(base, to, event, at, options.reason);
}

/**
 * Avança o relógio. Devolve `null` quando não há nada vencido — é o que o
 * agendador chama em laço para que nenhum duelo fique preso num estado.
 */
export function tick(snapshot: DuelSnapshot, now: number): TransitionResult | null {
  if (!isTimedOut(snapshot, now)) return null;
  const rule = FLOW[snapshot.state];
  if (rule.onTimeout === null) return null;
  return move(snapshot, rule.onTimeout.to, 'timeout', now, rule.onTimeout.reason);
}

/** Estado inicial de um duelo entrando na fila. */
export function startDuel(at: number): DuelSnapshot {
  return { state: 'queued', enteredAt: at };
}
