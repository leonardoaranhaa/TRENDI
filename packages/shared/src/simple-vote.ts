import type { Side } from './domain.js';

/**
 * Apuração simples: um voto, um voto.
 *
 * É o que a Fase 1 usa (roadmap: "votação simples, sem peso cruzado"). O
 * objetivo da fase é descobrir se o formato diverte, e peso cruzado só
 * atrapalharia a leitura desse sinal.
 *
 * A fórmula de verdade — 0,50 rival, 0,35 geral, 0,15 própria — já existe em
 * `cross-vote.ts`, testada, e entra na Fase 2 junto com as arquibancadas
 * travadas (C-12 e C-14). Aqui não se aplica peso nenhum de propósito.
 *
 * O que vale nas duas: voto é gratuito e igual. Nada de dinheiro entra —
 * decisão D-03.
 */

export interface SimpleVote {
  readonly votedFor: Side;
  readonly annulled?: boolean;
}

export interface SimpleTally {
  readonly forA: number;
  readonly forB: number;
  readonly voters: number;
  readonly winner: Side | 'tie' | 'undecided';
  /** Proporção de cada lado, entre 0 e 1. `null` quando ninguém votou. */
  readonly shareA: number | null;
  readonly shareB: number | null;
}

export function tallySimpleVote(votes: readonly SimpleVote[]): SimpleTally {
  let forA = 0;
  let forB = 0;

  for (const vote of votes) {
    if (vote.annulled === true) continue;
    if (vote.votedFor === 'a') forA += 1;
    else forB += 1;
  }

  const voters = forA + forB;
  if (voters === 0) {
    return { forA, forB, voters, winner: 'undecided', shareA: null, shareB: null };
  }

  return {
    forA,
    forB,
    voters,
    winner: forA === forB ? 'tie' : forA > forB ? 'a' : 'b',
    shareA: forA / voters,
    shareB: forB / voters,
  };
}
