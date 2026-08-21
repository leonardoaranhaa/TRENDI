/**
 * Voto cruzado — o julgamento do duelo.
 *
 * Especificação: 01-conceito/regras-do-duelo.md §4. Decisão travada: D-02.
 * Este arquivo é o único lugar onde a fórmula existe (convenção 1 de
 * 02-arquitetura/convencoes.md). Se divergir do arquivo de regras, é bug.
 *
 * Princípio inegociável 1 do projeto: nenhum valor pago entra aqui. Um voto
 * é um voto. Se algum dia esta função receber peso em dinheiro, está errada
 * mesmo que funcione — ver decisão D-03.
 */

import { STANDS, opposingSide, rivalStandOf, type Side, type Stand } from './domain.js';

/**
 * Pesos por origem do voto. Somam 1.
 * Rival vale mais porque converter quem torce contra é o sinal mais honesto.
 */
export const CROSS_VOTE_WEIGHTS = {
  rival: 0.5,
  general: 0.35,
  own: 0.15,
} as const;

/** Abaixo disso a arquibancada é descartada e o peso dela é redistribuído. */
export const MIN_VOTERS_PER_STAND = 10;

/** Abaixo disso o duelo vale para diversão e clipe, mas não pontua no ranking. */
export const MIN_VOTERS_FOR_RANKING = 30;

/** Diferença abaixo da qual duas pontuações são consideradas empate. */
export const SCORE_EPSILON = 1e-9;

/** Um voto de resultado. Sem peso, sem preço — ver D-03. */
export interface ResultVote {
  voterId: string;
  /** Arquibancada de origem, travada quando a votação abriu. */
  stand: Stand;
  votedFor: Side;
  /** Anulado pelo antifraude. Não entra na conta, mas fica no registro. */
  annulled?: boolean;
}

export interface StandTally {
  /** Votos válidos vindos desta arquibancada. */
  voters: number;
  forA: number;
  forB: number;
  /** Proporção de votos em A. `null` quando ninguém votou. */
  proportionForA: number | null;
  /** Descartada por não alcançar MIN_VOTERS_PER_STAND. */
  discarded: boolean;
}

export type Winner = Side | 'tie' | 'undecided';

export interface DuelScore {
  scoreA: number;
  scoreB: number;
  winner: Winner;
  /** Como o vencedor saiu: pela pontuação, pelo desempate, ou não saiu. */
  decidedBy: 'score' | 'rival_proportion' | 'none';
  /** Pesos efetivos de cada lado depois da redistribuição. */
  effectiveWeights: Record<Side, Record<Stand, number>>;
  stands: Record<Stand, StandTally>;
  /** Votantes válidos somando as três arquibancadas. */
  validVoters: number;
  countsForRanking: boolean;
}

/** Peso base de uma arquibancada na visão de um lado. */
function baseWeight(side: Side, stand: Stand): number {
  if (stand === 'general') return CROSS_VOTE_WEIGHTS.general;
  return stand === side ? CROSS_VOTE_WEIGHTS.own : CROSS_VOTE_WEIGHTS.rival;
}

function emptyTally(): StandTally {
  return { voters: 0, forA: 0, forB: 0, proportionForA: null, discarded: true };
}

/**
 * Agrupa os votos por arquibancada e marca as descartadas.
 *
 * @throws se o mesmo `voterId` aparecer duas vezes. Uma conta é um voto:
 * o banco garante isso com índice único em (duelo_id, usuario_id), e voto
 * contado em dobro corrompe o resultado em silêncio — melhor explodir.
 */
export function tallyByStand(votes: readonly ResultVote[]): Record<Stand, StandTally> {
  const seen = new Set<string>();
  const tallies: Record<Stand, StandTally> = {
    a: emptyTally(),
    b: emptyTally(),
    general: emptyTally(),
  };

  for (const vote of votes) {
    if (seen.has(vote.voterId)) {
      throw new Error(
        `voto duplicado do votante ${vote.voterId} — uma conta é um voto (índice único em result_votes)`,
      );
    }
    seen.add(vote.voterId);
    if (vote.annulled === true) continue;

    const tally = tallies[vote.stand];
    tally.voters += 1;
    if (vote.votedFor === 'a') tally.forA += 1;
    else tally.forB += 1;
  }

  for (const stand of STANDS) {
    const tally = tallies[stand];
    tally.discarded = tally.voters < MIN_VOTERS_PER_STAND;
    tally.proportionForA = tally.voters === 0 ? null : tally.forA / tally.voters;
  }

  return tallies;
}

/**
 * Pesos efetivos de um lado: descarta as arquibancadas sem votantes
 * suficientes e redistribui o peso delas proporcionalmente entre as que
 * sobraram. É daqui que sai o caso documentado "Geral vazia → rival 0,77,
 * própria 0,23" — não é regra à parte, é a redistribuição aplicada.
 *
 * Devolve todos os pesos zerados quando nenhuma arquibancada sobrevive.
 */
export function effectiveWeights(
  side: Side,
  stands: Record<Stand, StandTally>,
): Record<Stand, number> {
  const kept = STANDS.filter((stand) => !stands[stand].discarded);
  const total = kept.reduce((sum, stand) => sum + baseWeight(side, stand), 0);

  const weights: Record<Stand, number> = { a: 0, b: 0, general: 0 };
  if (total === 0) return weights;
  for (const stand of kept) weights[stand] = baseWeight(side, stand) / total;
  return weights;
}

function scoreFor(
  side: Side,
  stands: Record<Stand, StandTally>,
  weights: Record<Stand, number>,
): number {
  let score = 0;
  for (const stand of STANDS) {
    const weight = weights[stand];
    if (weight === 0) continue;
    const tally = stands[stand];
    const proportion = side === 'a' ? tally.proportionForA! : 1 - tally.proportionForA!;
    score += weight * proportion;
  }
  return score;
}

/**
 * Empate resolvido pela proporção da torcida rival isolada: quem converteu
 * mais gente do outro lado. Só vale com as duas torcidas em pé — comparar a
 * conversão de um lado contra uma arquibancada descartada não é desempate,
 * é sorteio.
 */
function breakTie(stands: Record<Stand, StandTally>): Side | 'tie' {
  const rivalOfA = stands[rivalStandOf('a')];
  const rivalOfB = stands[rivalStandOf('b')];
  if (rivalOfA.discarded || rivalOfB.discarded) return 'tie';

  const conversionOfA = rivalOfA.proportionForA!;
  const conversionOfB = 1 - rivalOfB.proportionForA!;
  if (Math.abs(conversionOfA - conversionOfB) <= SCORE_EPSILON) return 'tie';
  return conversionOfA > conversionOfB ? 'a' : 'b';
}

/**
 * Apura o duelo. Pontuação sempre entre 0 e 1; a maior vence.
 *
 * `winner` é `undecided` quando nenhuma arquibancada alcançou o mínimo de
 * votantes: não dá para julgar, e o duelo não pontua no ranking.
 */
export function scoreDuel(votes: readonly ResultVote[]): DuelScore {
  const stands = tallyByStand(votes);
  const validVoters = STANDS.reduce((sum, stand) => sum + stands[stand].voters, 0);

  const weightsA = effectiveWeights('a', stands);
  const weightsB = effectiveWeights('b', stands);
  const everyStandDiscarded = STANDS.every((stand) => stands[stand].discarded);

  if (everyStandDiscarded) {
    return {
      scoreA: 0,
      scoreB: 0,
      winner: 'undecided',
      decidedBy: 'none',
      effectiveWeights: { a: weightsA, b: weightsB },
      stands,
      validVoters,
      countsForRanking: false,
    };
  }

  const scoreA = scoreFor('a', stands, weightsA);
  const scoreB = scoreFor('b', stands, weightsB);

  const tied = Math.abs(scoreA - scoreB) <= SCORE_EPSILON;
  const winner: Winner = tied ? breakTie(stands) : scoreA > scoreB ? 'a' : 'b';
  const decidedBy = tied ? (winner === 'tie' ? 'none' : 'rival_proportion') : 'score';

  return {
    scoreA,
    scoreB,
    winner,
    decidedBy,
    effectiveWeights: { a: weightsA, b: weightsB },
    stands,
    validVoters,
    // O caso indeciso já saiu acima com countsForRanking falso.
    countsForRanking: validVoters >= MIN_VOTERS_FOR_RANKING,
  };
}

/** Quem perdeu, quando houve vencedor. */
export function loserOf(score: DuelScore): Side | null {
  return score.winner === 'a' || score.winner === 'b' ? opposingSide(score.winner) : null;
}
