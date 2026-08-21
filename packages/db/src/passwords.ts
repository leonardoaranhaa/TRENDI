import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';
import { promisify } from 'node:util';

/**
 * Senha da conta nativa (decisão D-19).
 *
 * `scrypt` vem no Node — sem dependência nativa para compilar, sem
 * biblioteca para acompanhar. É lento de propósito e usa memória de
 * propósito: é isso que torna caro tentar uma lista de senhas contra um
 * dump vazado.
 *
 * O que fica guardado é `scrypt$N$r$p$salt$hash`. Os parâmetros vão no
 * próprio registro para poder endurecer depois sem invalidar o que já existe.
 */

// `promisify` perde a sobrecarga com opções, e é justamente a que usamos.
const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
) => Promise<Buffer>;

/** ~32 MB por verificação. Sobe se a máquina aguentar; nunca desce. */
const COST = { N: 32_768, r: 8, p: 1 } as const;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

export const PASSWORD_MIN_LENGTH = 10;
/** Teto que evita alguém mandar 10 MB de senha e ocupar a CPU do processo. */
export const PASSWORD_MAX_LENGTH = 200;

/** As mais tentadas do mundo, em inglês e em português. */
const COMMON = new Set([
  '1234567890',
  '12345678910',
  'senha123456',
  'password123',
  'qwertyuiop',
  'trendi12345',
  'admin123456',
  'iloveyou123',
]);

export type PasswordProblem = 'muito_curta' | 'muito_longa' | 'obvia' | 'igual_ao_email';

/** `null` quando a senha serve; o problema, quando não. */
export function validatePassword(password: string, email?: string): PasswordProblem | null {
  if (password.length < PASSWORD_MIN_LENGTH) return 'muito_curta';
  if (password.length > PASSWORD_MAX_LENGTH) return 'muito_longa';
  if (COMMON.has(password.toLowerCase())) return 'obvia';

  if (email !== undefined && email !== '') {
    const normalized = password.toLowerCase();
    const local = email.toLowerCase().split('@')[0] ?? '';
    if (normalized === email.toLowerCase() || (local.length >= 4 && normalized === local)) {
      return 'igual_ao_email';
    }
  }

  return null;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = await scryptAsync(password, salt, KEY_LENGTH, {
    ...COST,
    // O Node limita a memória do scrypt por padrão; sem isto, N alto falha.
    maxmem: 256 * 1024 * 1024,
  });

  return [
    'scrypt',
    COST.N,
    COST.r,
    COST.p,
    salt.toString('base64url'),
    derived.toString('base64url'),
  ].join('$');
}

/**
 * Confere a senha contra o registro guardado.
 *
 * Devolve `false` para registro estranho em vez de estourar: senha errada e
 * registro corrompido levam ao mesmo lugar, que é não entrar.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const [, rawN, rawR, rawP, rawSalt, rawHash] = parts as [
    string,
    string,
    string,
    string,
    string,
    string,
  ];
  const N = Number(rawN);
  const r = Number(rawR);
  const p = Number(rawP);
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return false;

  const expected = Buffer.from(rawHash, 'base64url');
  if (expected.length === 0) return false;

  try {
    const derived = await scryptAsync(password, Buffer.from(rawSalt, 'base64url'), expected.length, {
      N,
      r,
      p,
      maxmem: 256 * 1024 * 1024,
    });
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}
