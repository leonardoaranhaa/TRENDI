import { describe, expect, it } from 'vitest';
import {
  MENSAGEM_DE_ERRO,
  PUBLICACAO_INICIAL,
  estaNoAr,
  motivoDoErro,
  podeCortar,
  reduzir,
  type EventoPublicacao,
  type Publicacao,
} from './publicacao';

/** Aplica uma sequência de eventos, como a tela faria. */
function apos(...eventos: EventoPublicacao[]): Publicacao {
  return eventos.reduce(reduzir, PUBLICACAO_INICIAL);
}

const COM_CAMERA: EventoPublicacao = {
  tipo: 'permissao_concedida',
  comVideo: true,
  comAudio: true,
};

describe('caminho normal', () => {
  it('vai de ocioso à prévia e ao ar', () => {
    const previa = apos({ tipo: 'pedir_permissao' }, COM_CAMERA);
    expect(previa).toMatchObject({ estado: 'previa', comVideo: true, comAudio: true, erro: null });

    const publicando = reduzir(previa, { tipo: 'publicar', modoLocal: false });
    expect(publicando.estado).toBe('publicando');
    expect(estaNoAr(publicando)).toBe(true);
  });

  it('encerra limpando câmera e microfone', () => {
    const fim = apos({ tipo: 'pedir_permissao' }, COM_CAMERA, { tipo: 'publicar', modoLocal: false }, { tipo: 'encerrar' });

    expect(fim).toMatchObject({ estado: 'encerrado', comVideo: false, comAudio: false });
  });

  it('deixa entrar só com áudio', () => {
    const previa = apos(
      { tipo: 'pedir_permissao' },
      { tipo: 'permissao_concedida', comVideo: false, comAudio: true },
    );

    expect(previa).toMatchObject({ estado: 'previa', comVideo: false, comAudio: true });
  });
});

describe('modo local', () => {
  it('publica sem estar no ar enquanto não há fornecedor', () => {
    const local = apos({ tipo: 'pedir_permissao' }, COM_CAMERA, { tipo: 'publicar', modoLocal: true });

    expect(local.estado).toBe('publicando');
    // A prévia funciona, mas nada sai da máquina. É o estado até L-19, e a
    // tela precisa poder dizer isso na cara.
    expect(estaNoAr(local)).toBe(false);
    expect(local.modoLocal).toBe(true);
  });
});

describe('quando dá errado', () => {
  it('sem vídeo e sem áudio é aparelho sem dispositivo', () => {
    const resultado = apos(
      { tipo: 'pedir_permissao' },
      { tipo: 'permissao_concedida', comVideo: false, comAudio: false },
    );

    expect(resultado).toMatchObject({ estado: 'erro', erro: 'sem_dispositivo' });
  });

  it('traduz a exceção do navegador', () => {
    expect(motivoDoErro({ name: 'NotAllowedError' })).toBe('permissao_negada');
    expect(motivoDoErro({ name: 'SecurityError' })).toBe('permissao_negada');
    expect(motivoDoErro({ name: 'NotFoundError' })).toBe('sem_dispositivo');
    expect(motivoDoErro({ name: 'OverconstrainedError' })).toBe('sem_dispositivo');
    expect(motivoDoErro({ name: 'CoisaNova' })).toBe('desconhecido');
    expect(motivoDoErro('nem é objeto')).toBe('desconhecido');
    expect(motivoDoErro(null)).toBe('desconhecido');
  });

  it('toda mensagem diz o que fazer, não só o que houve', () => {
    for (const mensagem of Object.values(MENSAGEM_DE_ERRO)) {
      expect(mensagem.length).toBeGreaterThan(30);
      expect(mensagem).toMatch(/[.!]$/);
    }
  });

  it('pedir permissão de novo limpa o erro anterior', () => {
    const tentandoDeNovo = apos(
      { tipo: 'pedir_permissao' },
      { tipo: 'falhou', motivo: 'permissao_negada' },
      { tipo: 'pedir_permissao' },
    );

    expect(tentandoDeNovo).toMatchObject({ estado: 'pedindo_permissao', erro: null });
  });
});

describe('cortar câmera e microfone', () => {
  it('corta e devolve', () => {
    const previa = apos({ tipo: 'pedir_permissao' }, COM_CAMERA);

    const semVideo = reduzir(previa, { tipo: 'cortar_video', cortado: true });
    expect(semVideo.comVideo).toBe(false);
    expect(reduzir(semVideo, { tipo: 'cortar_video', cortado: false }).comVideo).toBe(true);

    const semAudio = reduzir(previa, { tipo: 'cortar_audio', cortado: true });
    expect(semAudio.comAudio).toBe(false);
  });

  it('cortar não tira do ar — o quadro parado continua sendo o seu lado', () => {
    const noAr = apos({ tipo: 'pedir_permissao' }, COM_CAMERA, { tipo: 'publicar', modoLocal: false });
    const cortado = reduzir(noAr, { tipo: 'cortar_video', cortado: true });

    expect(cortado.estado).toBe('publicando');
    expect(estaNoAr(cortado)).toBe(true);
  });

  it('só oferece o corte a partir da prévia', () => {
    expect(podeCortar(PUBLICACAO_INICIAL)).toBe(false);
    expect(podeCortar(apos({ tipo: 'pedir_permissao' }))).toBe(false);
    expect(podeCortar(apos({ tipo: 'pedir_permissao' }, COM_CAMERA))).toBe(true);
  });
});

describe('o que a máquina não deixa acontecer', () => {
  it('não publica sem passar pela prévia', () => {
    const semPrevia = reduzir(PUBLICACAO_INICIAL, { tipo: 'publicar', modoLocal: false });

    // Publicar direto seria a pessoa ir ao ar sem ter visto o próprio quadro.
    expect(semPrevia.estado).toBe('ocioso');
  });

  it('não publica a partir do erro', () => {
    const comErro = apos({ tipo: 'pedir_permissao' }, { tipo: 'falhou', motivo: 'permissao_negada' });

    expect(reduzir(comErro, { tipo: 'publicar', modoLocal: false }).estado).toBe('erro');
  });
});
