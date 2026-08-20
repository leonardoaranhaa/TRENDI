/**
 * Regras do `handle` — o nome público de quem entra.
 *
 * Vem do perfil do provedor de OAuth, que não tem compromisso nenhum com o
 * nosso formato: pode ter acento, espaço, emoji, ou já estar em uso aqui.
 */

export const HANDLE_MIN_LENGTH = 3;
export const HANDLE_MAX_LENGTH = 20;
const HANDLE_PATTERN = /^[a-z0-9_]+$/;

/** Palavras que não podem virar handle porque já significam outra coisa. */
const RESERVED = new Set([
  'admin',
  'api',
  'ao_vivo',
  'duelo',
  'duelos',
  'entrar',
  'sair',
  'perfil',
  'ranking',
  'suporte',
  'trendi',
  'moderacao',
  'oficial',
]);

export type HandleProblem = 'muito_curto' | 'muito_longo' | 'caracteres_invalidos' | 'reservado';

/** `null` quando o handle serve; o problema, quando não. */
export function validateHandle(handle: string): HandleProblem | null {
  if (handle.length < HANDLE_MIN_LENGTH) return 'muito_curto';
  if (handle.length > HANDLE_MAX_LENGTH) return 'muito_longo';
  if (!HANDLE_PATTERN.test(handle)) return 'caracteres_invalidos';
  if (RESERVED.has(handle)) return 'reservado';
  return null;
}

/**
 * Transforma o nome do provedor em algo que caiba na nossa regra: minúsculas,
 * sem acento, espaço vira `_`, e o resto some. Sobrando nada aproveitável,
 * devolve um handle anônimo em vez de falhar — ninguém fica sem entrar por
 * causa do apelido.
 */
export function normalizeHandle(raw: string): string {
  const stripped = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // tira os acentos que o NFD separou
    .toLowerCase()
    .replace(/[\s.-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, HANDLE_MAX_LENGTH);

  if (stripped.length >= HANDLE_MIN_LENGTH && !RESERVED.has(stripped)) return stripped;
  return `duelista_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Acha a primeira variação livre: `leo`, `leo2`, `leo3`… O sufixo respeita o
 * limite de tamanho, cortando a base quando precisa.
 */
export async function findFreeHandle(
  desired: string,
  isTaken: (handle: string) => Promise<boolean>,
  maxAttempts = 50,
): Promise<string> {
  if (!(await isTaken(desired))) return desired;

  for (let suffix = 2; suffix <= maxAttempts; suffix += 1) {
    const tail = String(suffix);
    const base = desired.slice(0, HANDLE_MAX_LENGTH - tail.length);
    const candidate = `${base}${tail}`;
    if (!(await isTaken(candidate))) return candidate;
  }

  return `duelista_${Math.random().toString(36).slice(2, 10)}`;
}
