import { describe, expect, it } from 'vitest';
import { mensagemDoVoto, situacaoDaPlateia, type Plateia } from './estadio.js';

const VISITANTE: Plateia = { logado: false, jaVotou: null, temVideo: true };
const TORCEDOR: Plateia = { logado: true, jaVotou: null, temVideo: true };

describe('visitante assiste', () => {
  it('vê o duelo no ar sem ter conta', () => {
    const situacao = situacaoDaPlateia('running', VISITANTE);

    expect(situacao.aoVivo).toBe(true);
    expect(situacao.precisaEntrar).toBe(false);
    expect(situacao.chamada).toBe('No ar agora.');
  });

  it('só encontra a parede quando há o que fazer do outro lado', () => {
    // Assistir não pede conta; votar pede. A tela só cobra login no momento
    // em que existe uma ação de verdade atrás da parede.
    expect(situacaoDaPlateia('running', VISITANTE).precisaEntrar).toBe(false);
    expect(situacaoDaPlateia('voting', VISITANTE).precisaEntrar).toBe(true);
  });

  it('não fala no chat', () => {
    expect(situacaoDaPlateia('running', VISITANTE).podeFalar).toBe(false);
    expect(situacaoDaPlateia('running', TORCEDOR).podeFalar).toBe(true);
  });

  it('é convidado a entrar, com o motivo escrito', () => {
    expect(situacaoDaPlateia('voting', VISITANTE).chamada).toMatch(/Entre para votar/);
  });
});

describe('voto', () => {
  it('abre na votação, para quem tem conta e ainda não votou', () => {
    expect(situacaoDaPlateia('voting', TORCEDOR).podeVotar).toBe(true);
  });

  it('fecha para quem já votou — uma conta, um voto', () => {
    const situacao = situacaoDaPlateia('voting', { ...TORCEDOR, jaVotou: 'a' });

    expect(situacao.podeVotar).toBe(false);
    expect(situacao.chamada).toMatch(/Voto registrado/);
  });

  it('não abre fora da janela', () => {
    for (const estado of ['running', 'preparing', 'result', 'cancelled'] as const) {
      expect(situacaoDaPlateia(estado, TORCEDOR).podeVotar).toBe(false);
    }
  });

  it('não abre para visitante, mesmo com a janela aberta', () => {
    expect(situacaoDaPlateia('voting', VISITANTE).podeVotar).toBe(false);
  });
});

describe('placar', () => {
  it('não aparece durante a votação', () => {
    // A regra é do produto, não da tela: placar que anda ao vivo empurra
    // quem ainda não votou para o lado que está ganhando.
    expect(situacaoDaPlateia('voting', TORCEDOR).mostraPlacar).toBe(false);
    expect(situacaoDaPlateia('voting', { ...TORCEDOR, jaVotou: 'b' }).mostraPlacar).toBe(false);
  });

  it('aparece só no resultado', () => {
    expect(situacaoDaPlateia('result', TORCEDOR).mostraPlacar).toBe(true);
    expect(situacaoDaPlateia('running', TORCEDOR).mostraPlacar).toBe(false);
  });
});

describe('duelo sem vídeo', () => {
  it('diz que não há vídeo, em vez de mostrar quadro preto', () => {
    // É o estado normal enquanto não existe conta AWS (L-19).
    const situacao = situacaoDaPlateia('running', { ...TORCEDOR, temVideo: false });

    expect(situacao.aoVivo).toBe(true);
    expect(situacao.chamada).toMatch(/ainda não há vídeo/);
  });
});

describe('erro de voto', () => {
  it('diz o que fazer, não o código do problema', () => {
    expect(mensagemDoVoto('ja_votou')).toMatch(/uma conta, um voto/i);
    expect(mensagemDoVoto('sem_sessao')).toMatch(/Entre para votar/);
  });

  it('tem saída para o erro que ninguém previu', () => {
    expect(mensagemDoVoto('coisa_estranha')).toMatch(/Tente de novo/);
    expect(mensagemDoVoto(null)).toBe('');
  });
});
