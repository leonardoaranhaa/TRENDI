/**
 * Vocabulário do domínio.
 *
 * O código é em inglês (02-arquitetura/convencoes.md), mas o cérebro do
 * projeto é em português. A tradução de cada termo está registrada na
 * decisão D-10, em 06-registro/decisoes.md — quem for procurar
 * "arquibancada" no código precisa achar `Stand` sem adivinhar.
 */

/** Lado do duelo. `a` e `b` são os dois criadores. */
export type Side = 'a' | 'b';

/**
 * Arquibancada: torcida de A, torcida de B, ou Geral (sem lado).
 * O espectador escolhe ao entrar e pode migrar até a votação abrir.
 * Ver 01-conceito/regras-do-duelo.md §7.
 */
export type Stand = Side | 'general';

export const STANDS: readonly Stand[] = ['a', 'b', 'general'];

/** A arquibancada rival de um lado — de onde vem o voto que mais pesa. */
export function rivalStandOf(side: Side): Stand {
  return side === 'a' ? 'b' : 'a';
}

/** O lado oposto. */
export function opposingSide(side: Side): Side {
  return side === 'a' ? 'b' : 'a';
}
