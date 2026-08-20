import { describe, expect, it } from 'vitest';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  hashPassword,
  validatePassword,
  verifyPassword,
} from './passwords.js';

describe('política de senha', () => {
  it('aceita senha razoável', () => {
    expect(validatePassword('duelo na madrugada')).toBeNull();
    expect(validatePassword('a'.repeat(PASSWORD_MIN_LENGTH))).toBeNull();
  });

  it('recusa o que não protege ninguém', () => {
    expect(validatePassword('curta')).toBe('muito_curta');
    expect(validatePassword('a'.repeat(PASSWORD_MAX_LENGTH + 1))).toBe('muito_longa');
    expect(validatePassword('password123')).toBe('obvia');
    expect(validatePassword('leo@trendi.test', 'leo@trendi.test')).toBe('igual_ao_email');
    // Conter o começo do e-mail é permitido; ser igual a ele, não.
    expect(validatePassword('leonardo12 na madrugada', 'leonardo12@trendi.test')).toBeNull();
  });

  it('não exige maiúscula, número ou símbolo', () => {
    // Regra de composição empurra a pessoa para "Senha@123". Tamanho protege
    // mais, e é o que a recomendação atual do NIST diz.
    expect(validatePassword('abacaxi com farinha')).toBeNull();
  });
});

describe('hash de senha', () => {
  it('confere a senha certa', async () => {
    const stored = await hashPassword('duelo na madrugada');
    expect(await verifyPassword('duelo na madrugada', stored)).toBe(true);
  });

  it('recusa a senha errada', async () => {
    const stored = await hashPassword('duelo na madrugada');
    expect(await verifyPassword('duelo na madrugadA', stored)).toBe(false);
    expect(await verifyPassword('', stored)).toBe(false);
  });

  it('não guarda a senha em lugar nenhum do registro', async () => {
    const stored = await hashPassword('abacaxi com farinha');
    expect(stored).not.toContain('abacaxi');
    expect(stored.startsWith('scrypt$')).toBe(true);
  });

  it('gera hash diferente para a mesma senha', async () => {
    // Sal por senha: duas contas com a mesma senha não têm o mesmo registro,
    // então quebrar uma não entrega a outra.
    const [a, b] = await Promise.all([hashPassword('mesma senha aqui'), hashPassword('mesma senha aqui')]);
    expect(a).not.toBe(b);
  });

  it('guarda os parâmetros de custo junto', async () => {
    const stored = await hashPassword('duelo na madrugada');
    const [algoritmo, N, r, p] = stored.split('$');

    expect(algoritmo).toBe('scrypt');
    expect(Number(N)).toBeGreaterThanOrEqual(32_768);
    expect([r, p]).toEqual(['8', '1']);
  });

  it('devolve falso para registro corrompido em vez de estourar', async () => {
    for (const lixo of ['', 'nada disso', 'scrypt$x$8$1$aa$bb', 'bcrypt$1$2$3$4$5', 'scrypt$1$1$1$$']) {
      expect(await verifyPassword('duelo na madrugada', lixo)).toBe(false);
    }
  });
});
