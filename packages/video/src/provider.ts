import type { Side } from '@trendi/shared';

/**
 * A camada de mídia do duelo (C-03).
 *
 * O resto do sistema fala com esta interface, nunca com o fornecedor. O
 * fornecedor escolhido é o Amazon IVS (decisão D-20), e a decisão traz um
 * gatilho de revisão escrito: quando a entrega dominar a conta, reavaliar.
 * Uma interface no meio é o que faz essa revisão caber num arquivo em vez de
 * numa refatoração.
 *
 * O que este contrato promete, e que vem direto dos princípios do produto:
 *
 * - **Sem download.** A credencial de publicação é para o navegador publicar
 *   direto, por WebRTC.
 * - **Latência simétrica.** Os dois competidores publicam no mesmo palco e a
 *   composição acontece uma vez, no servidor — ninguém vê o quadro antes do
 *   outro (decisão D-01).
 */

/** Um palco de duelo: onde os dois competidores publicam. */
export interface LiveStage {
  readonly stageId: string;
  /** Quem assiste usa isto. `null` até a composição começar. */
  readonly playbackUrl: string | null;
}

/** Credencial de publicação de um competidor. Curta, e de um lado só. */
export interface PublishCredential {
  readonly side: Side;
  readonly token: string;
  readonly expiresAt: Date;
  /** Endereço para onde o navegador publica. */
  readonly ingestEndpoint: string;
}

/**
 * Como o quadro do duelo é montado (C-05).
 *
 * Isto é regra de produto, não detalhe de fornecedor — por isso mora aqui, e
 * não dentro do adaptador do IVS. Trocar de fornecedor (a D-20 já prevê o
 * gatilho) é traduzir estas quatro linhas para o vocabulário do próximo.
 */
export const COMPOSITION_LAYOUT = {
  /**
   * Atributo do participante que decide a ordem dos lados: **A à esquerda,
   * B à direita, em todo duelo**. Sem isso a ordem é de chegada — quem
   * conectar primeiro fica na esquerda —, e aí "o da esquerda" deixa de
   * significar alguma coisa para quem assiste. Pior: placar e barulhômetro
   * ficam em DOM sobre o vídeo (D-20), fixos por lado, e passariam a apontar
   * para o competidor errado.
   */
  orderBy: 'side',
  /**
   * Câmera cortada continua ocupando o lado dela. Sumir com metade da tela
   * no meio do duelo confunde mais do que a câmera parada.
   */
  keepStoppedSide: true,
  /** Split-screen colado: sem faixa separando os dois. */
  gap: 0,
  /** Corta para preencher o lado, em vez de deixar tarja preta em volta. */
  fill: 'cover',
} as const;

export interface CompositionHandle {
  readonly compositionId: string;
  /** URL de reprodução para a plateia, em HLS. */
  readonly playbackUrl: string;
}

export interface Recording {
  readonly recordingId: string;
  /** Onde a gravação foi parar. É a matéria-prima dos clipes (C-21). */
  readonly url: string;
  readonly durationS: number;
}

export interface VideoProvider {
  readonly name: string;

  /** Abre o palco do duelo. Chamado quando os dois aceitam. */
  createStage(duelId: string): Promise<LiveStage>;

  /** Credencial para um competidor publicar do navegador. */
  issuePublishCredential(stageId: string, side: Side): Promise<PublishCredential>;

  /**
   * Liga a composição: os dois lados viram um quadro só, e esse quadro vai
   * para a plateia. Placar e barulhômetro **não** entram aqui — ficam em DOM
   * sobre o vídeo (D-20), porque o barulhômetro precisa ser inconfundível
   * com o placar (D-05) e isso se itera em CSS.
   */
  startComposition(stageId: string): Promise<CompositionHandle>;

  /** Desliga a composição e devolve a gravação, quando houver. */
  stopComposition(compositionId: string): Promise<Recording | null>;

  /** Fecha o palco. Idempotente: duelo cancelado pode chamar duas vezes. */
  closeStage(stageId: string): Promise<void>;
}

export class VideoProviderError extends Error {
  constructor(
    message: string,
    readonly provider: string,
    override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'VideoProviderError';
  }
}
