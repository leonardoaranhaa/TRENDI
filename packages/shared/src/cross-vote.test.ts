import { describe, expect, it } from 'vitest';
import {
  CROSS_VOTE_WEIGHTS,
  MIN_VOTERS_FOR_RANKING,
  MIN_VOTERS_PER_STAND,
  scoreDuel,
  tallyByStand,
  type ResultVote,
} from './cross-vote.js';
import type { Side, Stand } from './domain.js';

/** Monta `total` votos vindos de uma arquibancada, `forA` deles em A. */
function votesFrom(stand: Stand, total: number, forA: number): ResultVote[] {
  return Array.from({ length: total }, (_, index) => ({
    voterId: `${stand}-${index}`,
    stand,
    votedFor: (index < forA ? 'a' : 'b') satisfies Side as Side,
  }));
}

describe('pesos', () => {
  it('somam 1 — decisão D-02', () => {
    const { rival, general, own } = CROSS_VOTE_WEIGHTS;
    expect(rival + general + own).toBe(1);
  });
});

describe('fórmula com as três arquibancadas em pé', () => {
  const votes = [
    ...votesFrom('a', 20, 15), // própria torcida de A: 75% em A
    ...votesFrom('b', 20, 8), //  torcida rival: 40% em A
    ...votesFrom('general', 20, 10), // geral dividida
  ];

  it('aplica 0,50 rival + 0,35 geral + 0,15 própria', () => {
    const score = scoreDuel(votes);
    // A: .5(8/20) + .35(10/20) + .15(15/20)
    expect(score.scoreA).toBeCloseTo(0.5 * 0.4 + 0.35 * 0.5 + 0.15 * 0.75, 12);
    // B: .5(5/20) + .35(10/20) + .15(12/20)
    expect(score.scoreB).toBeCloseTo(0.5 * 0.25 + 0.35 * 0.5 + 0.15 * 0.6, 12);
    expect(score.winner).toBe('a');
    expect(score.decidedBy).toBe('score');
  });

  it('mantém as pontuações entre 0 e 1', () => {
    const score = scoreDuel(votes);
    for (const value of [score.scoreA, score.scoreB]) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});

describe('a promessa da decisão D-02', () => {
  it('deixa 100 espectadores vencerem 10.000 quando a conversão é maior', () => {
    const score = scoreDuel([
      ...votesFrom('a', 1000, 950), // torcida enorme, fiel ao seu criador
      ...votesFrom('b', 20, 15), //   torcida pequena, mas convertida por A
      ...votesFrom('general', 100, 50),
    ]);

    expect(score.winner).toBe('a');
    expect(score.scoreA).toBeGreaterThan(score.scoreB);
  });

  it('limita a própria torcida a 0,15 — manipulá-la não ganha duelo', () => {
    const score = scoreDuel([
      ...votesFrom('a', 20, 20), //      torcida de A inteira em A
      ...votesFrom('b', 20, 0), //       torcida de B inteira em B
      ...votesFrom('general', 20, 0), // e a geral também em B
    ]);

    // Teto da própria torcida: 0,15. É o que a decisão D-02 promete.
    expect(score.scoreA).toBeCloseTo(CROSS_VOTE_WEIGHTS.own, 12);
    expect(score.winner).toBe('b');
  });
});

describe('arquibancada com poucos votantes', () => {
  it(`descarta abaixo de ${MIN_VOTERS_PER_STAND} votantes e redistribui o peso`, () => {
    const score = scoreDuel([
      ...votesFrom('a', 20, 10),
      ...votesFrom('b', 20, 12),
      ...votesFrom('general', MIN_VOTERS_PER_STAND - 1, 5),
    ]);

    expect(score.stands.general.discarded).toBe(true);
    expect(score.effectiveWeights.a.general).toBe(0);
    // Sobraram rival (0,50) e própria (0,15): 0,65 redistribuídos.
    expect(score.effectiveWeights.a.b).toBeCloseTo(0.5 / 0.65, 12);
    expect(score.effectiveWeights.a.a).toBeCloseTo(0.15 / 0.65, 12);
  });

  it('com a Geral vazia, chega no 0,77 / 0,23 do arquivo de regras', () => {
    const score = scoreDuel([...votesFrom('a', 20, 10), ...votesFrom('b', 20, 10)]);

    expect(score.effectiveWeights.a.b).toBeCloseTo(0.77, 2);
    expect(score.effectiveWeights.a.a).toBeCloseTo(0.23, 2);
    expect(score.effectiveWeights.a.b + score.effectiveWeights.a.a).toBeCloseTo(1, 12);
  });

  it('fica indeciso quando nenhuma arquibancada alcança o mínimo', () => {
    const score = scoreDuel([...votesFrom('a', 5, 3), ...votesFrom('general', 4, 4)]);

    expect(score.winner).toBe('undecided');
    expect(score.decidedBy).toBe('none');
    expect(score.countsForRanking).toBe(false);
  });
});

describe('empate', () => {
  it('desempata pela conversão da torcida rival', () => {
    // Pontuações idênticas (0,57 dos dois lados), conversões diferentes.
    const score = scoreDuel([
      ...votesFrom('a', 10, 4),
      ...votesFrom('b', 10, 8),
      ...votesFrom('general', 35, 11),
    ]);

    expect(score.scoreA).toBeCloseTo(score.scoreB, 12);
    expect(score.winner).toBe('a'); // converteu 80% da torcida rival contra 60%
    expect(score.decidedBy).toBe('rival_proportion');
  });

  it('registra empate quando nem a conversão desempata', () => {
    const score = scoreDuel([
      ...votesFrom('a', 10, 5),
      ...votesFrom('b', 10, 5),
      ...votesFrom('general', 10, 5),
    ]);

    expect(score.winner).toBe('tie');
    expect(score.decidedBy).toBe('none');
  });

  it('não desempata com torcida rival descartada — seria sorteio', () => {
    const score = scoreDuel([
      ...votesFrom('a', 5, 3), // descartada
      ...votesFrom('general', 20, 10),
    ]);

    expect(score.scoreA).toBeCloseTo(score.scoreB, 12);
    expect(score.winner).toBe('tie');
  });
});

describe('quórum de ranking', () => {
  it(`pontua no ranking a partir de ${MIN_VOTERS_FOR_RANKING} votantes`, () => {
    const score = scoreDuel([
      ...votesFrom('a', 10, 6),
      ...votesFrom('b', 10, 6),
      ...votesFrom('general', 10, 6),
    ]);

    expect(score.validVoters).toBe(30);
    expect(score.countsForRanking).toBe(true);
  });

  it('vale para diversão, não para ranking, abaixo do quórum', () => {
    const score = scoreDuel([
      ...votesFrom('a', 10, 6),
      ...votesFrom('b', 10, 6),
      ...votesFrom('general', 9, 5),
    ]);

    expect(score.validVoters).toBe(29);
    expect(score.winner).toBe('a');
    expect(score.countsForRanking).toBe(false);
  });
});

describe('integridade dos votos', () => {
  it('ignora voto anulado pelo antifraude', () => {
    const votes: ResultVote[] = [
      ...votesFrom('a', 10, 5),
      ...votesFrom('b', 10, 5),
      ...votesFrom('general', 10, 5),
      { voterId: 'bot-1', stand: 'general', votedFor: 'a', annulled: true },
    ];

    const score = scoreDuel(votes);
    expect(score.validVoters).toBe(30);
    expect(score.stands.general.voters).toBe(10);
  });

  it('explode com voto duplicado em vez de contar em dobro', () => {
    const votes: ResultVote[] = [
      { voterId: 'u-1', stand: 'general', votedFor: 'a' },
      { voterId: 'u-1', stand: 'general', votedFor: 'a' },
    ];

    expect(() => tallyByStand(votes)).toThrowError(/duplicado/);
  });
});

describe('o que a fórmula não aceita', () => {
  it('não tem entrada para dinheiro — princípio 1 e decisão D-03', () => {
    const vote: ResultVote = { voterId: 'u-1', stand: 'general', votedFor: 'a' };
    // O teste é sobre o formato do voto: nenhum campo de peso, valor ou
    // presente. Se alguém adicionar um, este teste quebra de propósito.
    expect(Object.keys(vote).sort()).toEqual(['stand', 'votedFor', 'voterId']);
  });
});
