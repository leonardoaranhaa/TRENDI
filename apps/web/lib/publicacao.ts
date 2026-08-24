/**
 * Publicação do competidor (C-04).
 *
 * Princípio inegociável nº 4: **sem download**. A captação é `getUserMedia` no
 * navegador, e o envio é WebRTC pelo SDK do fornecedor. Se algum dia isto
 * exigir instalar coisa, está errado mesmo que funcione.
 *
 * A máquina de estados mora aqui, separada do SDK e da tela, por dois motivos:
 * ela é o que se testa sem navegador, e é ela que decide o que a pessoa vê —
 * e negar a câmera é o erro mais comum e o pior explicado da web.
 */

export type EstadoPublicacao =
  | 'ocioso'
  | 'pedindo_permissao'
  | 'previa'
  | 'publicando'
  | 'encerrado'
  | 'erro';

export type MotivoErro =
  | 'permissao_negada'
  | 'sem_dispositivo'
  | 'contexto_inseguro'
  | 'falha_ao_publicar'
  | 'desconhecido';

export interface Publicacao {
  readonly estado: EstadoPublicacao;
  readonly erro: MotivoErro | null;
  /** Verdadeiro quando há câmera na prévia, publicando ou não. */
  readonly comVideo: boolean;
  readonly comAudio: boolean;
  /**
   * Publicação de mentira: a prévia funciona, mas nada sai desta máquina.
   * É o estado normal enquanto a conta AWS não existe (L-19).
   */
  readonly modoLocal: boolean;
}

export const PUBLICACAO_INICIAL: Publicacao = {
  estado: 'ocioso',
  erro: null,
  comVideo: false,
  comAudio: false,
  modoLocal: false,
};

export type EventoPublicacao =
  | { tipo: 'pedir_permissao' }
  | { tipo: 'permissao_concedida'; comVideo: boolean; comAudio: boolean }
  | { tipo: 'falhou'; motivo: MotivoErro }
  | { tipo: 'publicar'; modoLocal: boolean }
  | { tipo: 'cortar_video'; cortado: boolean }
  | { tipo: 'cortar_audio'; cortado: boolean }
  | { tipo: 'encerrar' };

/**
 * O que a pessoa lê quando algo dá errado.
 *
 * Cada frase diz o que aconteceu e o que fazer — mensagem de erro que só
 * informa o código do problema empurra a pessoa para fora do duelo.
 */
export const MENSAGEM_DE_ERRO: Record<MotivoErro, string> = {
  permissao_negada:
    'Você bloqueou a câmera. Clique no cadeado ao lado do endereço, libere câmera e microfone, e recarregue.',
  sem_dispositivo:
    'Não achei câmera nem microfone neste aparelho. Conecte um e tente de novo — dá para entrar só com áudio.',
  contexto_inseguro:
    'O navegador só libera câmera em conexão segura (https). Em desenvolvimento, use localhost.',
  falha_ao_publicar: 'A conexão com o duelo caiu na hora de entrar no ar. Tente de novo.',
  desconhecido: 'Algo deu errado ao ligar a câmera. Tente de novo.',
};

export function reduzir(atual: Publicacao, evento: EventoPublicacao): Publicacao {
  switch (evento.tipo) {
    case 'pedir_permissao':
      return { ...atual, estado: 'pedindo_permissao', erro: null };

    case 'permissao_concedida':
      // Sem vídeo e sem áudio não é permissão concedida: é aparelho sem
      // dispositivo nenhum, e entrar assim seria entrar mudo e invisível.
      if (!evento.comVideo && !evento.comAudio) {
        return { ...atual, estado: 'erro', erro: 'sem_dispositivo' };
      }
      return {
        ...atual,
        estado: 'previa',
        erro: null,
        comVideo: evento.comVideo,
        comAudio: evento.comAudio,
      };

    case 'falhou':
      return { ...atual, estado: 'erro', erro: evento.motivo };

    case 'publicar':
      // Só se publica a partir da prévia: é o momento em que a pessoa já viu
      // o que vai ao ar.
      if (atual.estado !== 'previa') return atual;
      return { ...atual, estado: 'publicando', erro: null, modoLocal: evento.modoLocal };

    case 'cortar_video':
      return { ...atual, comVideo: !evento.cortado };

    case 'cortar_audio':
      return { ...atual, comAudio: !evento.cortado };

    case 'encerrar':
      return { ...atual, estado: 'encerrado', comVideo: false, comAudio: false };
  }
}

/** Traduz a exceção do `getUserMedia` para o motivo que a tela sabe explicar. */
export function motivoDoErro(erro: unknown): MotivoErro {
  if (typeof erro !== 'object' || erro === null || !('name' in erro)) return 'desconhecido';

  switch ((erro as { name: string }).name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'permissao_negada';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'sem_dispositivo';
    default:
      return 'desconhecido';
  }
}

/** Quem está publicando pode cortar câmera; quem nem chegou na prévia, não. */
export function podeCortar(publicacao: Publicacao): boolean {
  return publicacao.estado === 'previa' || publicacao.estado === 'publicando';
}

/** Está no ar de verdade — não em modo local. */
export function estaNoAr(publicacao: Publicacao): boolean {
  return publicacao.estado === 'publicando' && !publicacao.modoLocal;
}
