import { describe, expect, it } from 'vitest';
import {
  HANDLE_MAX_LENGTH,
  findFreeHandle,
  normalizeHandle,
  validateHandle,
} from './handles.js';

describe('validação de handle', () => {
  it('aceita o que cabe na regra', () => {
    for (const handle of ['leo', 'leo_aranha', 'duelista_2026', 'abc']) {
      expect(validateHandle(handle)).toBeNull();
    }
  });

  it('recusa o que não cabe', () => {
    expect(validateHandle('ab')).toBe('muito_curto');
    expect(validateHandle('a'.repeat(HANDLE_MAX_LENGTH + 1))).toBe('muito_longo');
    expect(validateHandle('Leo')).toBe('caracteres_invalidos');
    expect(validateHandle('leo aranha')).toBe('caracteres_invalidos');
    expect(validateHandle('leo-aranha')).toBe('caracteres_invalidos');
    expect(validateHandle('admin')).toBe('reservado');
  });
});

describe('normalização do nome que vem do provedor', () => {
  it('tira acento, caixa alta e espaço', () => {
    expect(normalizeHandle('Leonardo Aranha')).toBe('leonardo_aranha');
    expect(normalizeHandle('João Coração')).toBe('joao_coracao');
    expect(normalizeHandle('leo.aranha')).toBe('leo_aranha');
  });

  it('respeita o tamanho máximo', () => {
    expect(normalizeHandle('a'.repeat(50)).length).toBe(HANDLE_MAX_LENGTH);
  });

  it('sempre devolve handle válido, mesmo do nome mais hostil', () => {
    for (const raw of ['🔥🔥🔥', '', '__', 'admin', '...']) {
      expect(validateHandle(normalizeHandle(raw))).toBeNull();
    }
  });
});

describe('desduplicação', () => {
  it('devolve o desejado quando está livre', async () => {
    expect(await findFreeHandle('leo', async () => false)).toBe('leo');
  });

  it('anda até achar vaga', async () => {
    const usados = new Set(['leo', 'leo2', 'leo3']);
    expect(await findFreeHandle('leo', async (h) => usados.has(h))).toBe('leo4');
  });

  it('encurta a base para o sufixo caber no limite', async () => {
    const cheio = 'a'.repeat(HANDLE_MAX_LENGTH);
    const escolhido = await findFreeHandle(cheio, async (h) => h === cheio);

    expect(escolhido.length).toBeLessThanOrEqual(HANDLE_MAX_LENGTH);
    expect(escolhido.endsWith('2')).toBe(true);
  });

  it('cai num handle aleatório em vez de girar para sempre', async () => {
    const escolhido = await findFreeHandle('leo', async () => true, 5);
    expect(validateHandle(escolhido)).toBeNull();
  });
});
