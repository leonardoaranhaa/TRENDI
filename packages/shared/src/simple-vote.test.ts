import { describe, expect, it } from 'vitest';
import { tallySimpleVote, type SimpleVote } from './simple-vote.js';

function votos(paraA: number, paraB: number): SimpleVote[] {
  return [
    ...Array.from({ length: paraA }, () => ({ votedFor: 'a' as const })),
    ...Array.from({ length: paraB }, () => ({ votedFor: 'b' as const })),
  ];
}

describe('apuração simples', () => {
  it('quem tem mais voto ganha', () => {
    const resultado = tallySimpleVote(votos(7, 3));

    expect(resultado).toMatchObject({ forA: 7, forB: 3, voters: 10, winner: 'a' });
    expect(resultado.shareA).toBeCloseTo(0.7, 12);
  });

  it('empate é empate', () => {
    expect(tallySimpleVote(votos(5, 5)).winner).toBe('tie');
  });

  it('sem voto, sem resultado', () => {
    expect(tallySimpleVote([])).toMatchObject({ voters: 0, winner: 'undecided', shareA: null });
  });

  it('ignora voto anulado pelo antifraude', () => {
    const resultado = tallySimpleVote([
      ...votos(2, 1),
      { votedFor: 'b', annulled: true },
      { votedFor: 'b', annulled: true },
    ]);

    expect(resultado).toMatchObject({ forA: 2, forB: 1, voters: 3, winner: 'a' });
  });

  it('não aplica peso nenhum — é o que a Fase 1 quer', () => {
    // Mil votos de um lado valem mil, e não mil vezes coeficiente nenhum.
    const resultado = tallySimpleVote(votos(1000, 999));
    expect(resultado.forA - resultado.forB).toBe(1);
    expect(resultado.winner).toBe('a');
  });

  it('não tem entrada para dinheiro — princípio 1 e decisão D-03', () => {
    const voto: SimpleVote = { votedFor: 'a' };
    expect(Object.keys(voto)).toEqual(['votedFor']);
  });
});
