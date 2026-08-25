import { DUEL_LIFECYCLE, type DuelState } from './duel-state.js';

/**
 * O aviso de mudança de estado, entre a API e o tempo real (C-38).
 *
 * São dois processos separados — carga de chat não pode derrubar login —, e
 * a API não alcança o `publishState` do tempo real em memória. O recado
 * atravessa pelo `LISTEN`/`NOTIFY` do Postgres, que os dois já falam.
 *
 * A escolha tem duas razões, e a primeira é a que decide:
 *
 * 1. **O aviso vira parte da transição.** `pg_notify` dentro da transação só
 *    é entregue se ela der certo. Avisar de uma transição que não aconteceu
 *    passa a ser impossível por construção — HTTP depois do commit não dá
 *    essa garantia.
 * 2. **Vale para quantas instâncias de tempo real existirem.** Com HTTP a
 *    API precisaria conhecer o endereço de cada uma, e esquecer uma
 *    significaria metade da plateia com a janela de votação atrasada — que é
 *    o bug que esta tarefa existe para matar.
 *
 * Mora em `shared` porque é contrato de fio: quem emite e quem escuta
 * precisam concordar, e contrato que só um lado enxerga é como divergência
 * começa.
 */

export const DUEL_STATE_CHANNEL = 'duelo_estado';

export interface DuelStateNotice {
  readonly duelId: string;
  readonly state: DuelState;
}

/**
 * Lê o que veio pelo canal.
 *
 * Devolve `null` em vez de estourar: o tempo real não pode cair porque
 * alguém rodou um `NOTIFY` à mão no banco.
 */
export function parseDuelStateNotice(raw: string | undefined): DuelStateNotice | null {
  if (raw === undefined || raw === '') return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null) return null;
  const aviso = parsed as Record<string, unknown>;

  const { duelId, state } = aviso;
  if (typeof duelId !== 'string' || duelId === '') return null;
  if (typeof state !== 'string' || !DUEL_LIFECYCLE.includes(state as DuelState)) return null;

  return { duelId, state: state as DuelState };
}
