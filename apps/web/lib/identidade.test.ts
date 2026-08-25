import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * A identidade, onde ela é regra e não gosto.
 *
 * O azul da marca (#0132FF) sobre preto dá **2,9:1** de contraste — abaixo
 * do mínimo legível. Ele é cor de preenchimento; onde o texto precisa ser
 * azul, entra o `eletrico` (#5B82FF, 6,1:1).
 *
 * Isso é fácil de quebrar sem perceber: `text-azul` é o que qualquer um
 * escreveria primeiro, e o resultado fica bonito na captura de tela e
 * ilegível no celular de quem está no ônibus. Daí o teste.
 */

const RAIZ = join(import.meta.dirname, '..');

function telas(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) return telas(caminho);
    return caminho.endsWith('.tsx') ? [caminho] : [];
  });
}

describe('o azul da marca preenche, não escreve', () => {
  it('nenhuma tela usa text-azul', () => {
    const infratores = telas(join(RAIZ, 'app')).filter((caminho) =>
      /\btext-azul\b/.test(readFileSync(caminho, 'utf8')),
    );

    expect(infratores.map((c) => c.replace(`${RAIZ}/`, ''))).toEqual([]);
  });

  it('o token legível existe, e é ele que as telas usam para texto azul', () => {
    const tokens = readFileSync(join(RAIZ, 'app/globals.css'), 'utf8');

    expect(tokens).toContain('--color-azul: #0132ff');
    expect(tokens).toContain('--color-eletrico: #5b82ff');
  });
});

describe('o cinza-neutro não faz parte da paleta', () => {
  it('nenhuma tela voltou a usar neutral-*', () => {
    // A paleta é azul, branco e preto. O escuro sobe em azul-noite — é o que
    // separa a tela da TRENDI de qualquer painel escuro genérico.
    const infratores = telas(join(RAIZ, 'app')).filter((caminho) =>
      /\bbg-neutral-|\btext-neutral-|\bborder-neutral-/.test(readFileSync(caminho, 'utf8')),
    );

    expect(infratores.map((c) => c.replace(`${RAIZ}/`, ''))).toEqual([]);
  });
});
