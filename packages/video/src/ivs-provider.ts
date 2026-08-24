import {
  CreateParticipantTokenCommand,
  CreateStageCommand,
  DeleteStageCommand,
  StartCompositionCommand,
  StopCompositionCommand,
  type IVSRealTimeClient,
} from '@aws-sdk/client-ivs-realtime';
import type { Side } from '@trendi/shared';
import type {
  CompositionHandle,
  LiveStage,
  PublishCredential,
  Recording,
  VideoProvider,
} from './provider.js';
import { COMPOSITION_LAYOUT, VideoProviderError } from './provider.js';

/**
 * Amazon IVS (decisão D-20).
 *
 * O desenho: um **stage** recebe os dois competidores publicando do
 * navegador; a **composição** junta os dois num quadro só, em grade — que é
 * o split-screen; a saída vai para um **channel** de Low-Latency Streaming,
 * que é o que a plateia assiste, e para o **S3**, que é a gravação de onde
 * saem os clipes (C-21).
 *
 * Placar e barulhômetro não entram na composição: ficam em DOM sobre o
 * vídeo. Ver D-20 e D-05.
 *
 * O cliente da AWS entra por parâmetro. Isso deixa a tradução — nomes,
 * duração de token, formato do resultado — testável sem chamar a AWS, que é
 * lenta, custa dinheiro e falha por motivo alheio ao teste.
 *
 * ⚠️ Esta classe **ainda não foi exercitada contra a AWS de verdade**: a
 * conta não existe até `L-19`. O que está coberto por teste é a tradução.
 */

export interface IvsVideoProviderConfig {
  /** ARN do channel que entrega para a plateia. */
  readonly channelArn: string;
  /** ARN do encoder que define resolução e bitrate da composição. */
  readonly encoderConfigurationArn: string;
  /** ARN da configuração de storage onde a gravação é escrita. */
  readonly storageConfigurationArn: string;
  /** Base da URL de reprodução do channel. */
  readonly playbackUrl: string;
  /** Validade do token de publicação, em segundos. Teto do IVS: 20160 (14 dias). */
  readonly publishTokenDurationMinutes?: number;
}

/** Curto de propósito: o token vale para entrar, não para ficar guardado. */
const DEFAULT_TOKEN_MINUTES = 10;

/** O preenchimento do contrato, no vocabulário do IVS. */
const FILL_MODE = { cover: 'COVER', contain: 'CONTAIN' } as const;

export class IvsVideoProvider implements VideoProvider {
  readonly name = 'ivs';

  constructor(
    private readonly client: IVSRealTimeClient,
    private readonly config: IvsVideoProviderConfig,
  ) {}

  async createStage(duelId: string): Promise<LiveStage> {
    const resposta = await this.tentar(
      () =>
        this.client.send(
          new CreateStageCommand({
            name: `trendi-duelo-${duelId}`,
            tags: { duelId },
          }),
        ),
      'não consegui abrir o palco do duelo',
    );

    const stageId = resposta.stage?.arn;
    if (stageId === undefined) {
      throw new VideoProviderError('IVS criou palco sem ARN', this.name);
    }
    return { stageId, playbackUrl: null };
  }

  async issuePublishCredential(
    stageId: string,
    side: Side,
  ): Promise<PublishCredential> {
    const minutos =
      this.config.publishTokenDurationMinutes ?? DEFAULT_TOKEN_MINUTES;
    const resposta = await this.tentar(
      () =>
        this.client.send(
          new CreateParticipantTokenCommand({
            stageArn: stageId,
            duration: minutos,
            userId: `competidor-${side}`,
            // O lado vira atributo do participante: é por ele que a composição
            // sabe quem fica na esquerda e quem fica na direita.
            attributes: { side },
            capabilities: ['PUBLISH', 'SUBSCRIBE'],
          }),
        ),
      `não consegui emitir credencial de publicação para o lado ${side}`,
    );

    const token = resposta.participantToken?.token;
    if (token === undefined) {
      throw new VideoProviderError(
        'IVS devolveu participante sem token',
        this.name,
      );
    }

    return {
      side,
      token,
      expiresAt:
        resposta.participantToken?.expirationTime ??
        new Date(Date.now() + minutos * 60_000),
      ingestEndpoint: stageId,
    };
  }

  async startComposition(stageId: string): Promise<CompositionHandle> {
    const resposta = await this.tentar(
      () =>
        this.client.send(
          new StartCompositionCommand({
            stageArn: stageId,
            // Grade de dois é o split-screen. O que cada campo significa está
            // em `COMPOSITION_LAYOUT`; aqui é só a tradução para o IVS.
            layout: {
              grid: {
                gridGap: COMPOSITION_LAYOUT.gap,
                omitStoppedVideo: !COMPOSITION_LAYOUT.keepStoppedSide,
                videoAspectRatio: 'VIDEO',
                videoFillMode: FILL_MODE[COMPOSITION_LAYOUT.fill],
                // O atributo vem do token de publicação, onde `side` já é
                // gravado como 'a' ou 'b'. É este parâmetro que torna o lado
                // determinístico em vez de depender de quem conectou antes.
                participantOrderAttribute: COMPOSITION_LAYOUT.orderBy,
              },
            },
            destinations: [
              {
                name: 'plateia',
                channel: {
                  channelArn: this.config.channelArn,
                  encoderConfigurationArn: this.config.encoderConfigurationArn,
                },
              },
              {
                name: 'gravacao',
                s3: {
                  storageConfigurationArn: this.config.storageConfigurationArn,
                  encoderConfigurationArns: [
                    this.config.encoderConfigurationArn,
                  ],
                },
              },
            ],
          }),
        ),
      'não consegui ligar a composição do duelo',
    );

    const compositionId = resposta.composition?.arn;
    if (compositionId === undefined) {
      throw new VideoProviderError('IVS iniciou composição sem ARN', this.name);
    }
    return { compositionId, playbackUrl: this.config.playbackUrl };
  }

  async stopComposition(compositionId: string): Promise<Recording | null> {
    await this.tentar(
      () =>
        this.client.send(new StopCompositionCommand({ arn: compositionId })),
      'não consegui desligar a composição',
    );

    // O IVS fecha a gravação de forma assíncrona: a URL final só existe
    // depois. Quem monta clipe (C-21) lê do S3, não daqui.
    return null;
  }

  async closeStage(stageId: string): Promise<void> {
    try {
      await this.client.send(new DeleteStageCommand({ arn: stageId }));
    } catch (error) {
      // Palco que já não existe é o estado desejado. Idempotência importa:
      // duelo cancelado chama isto mais de uma vez.
      if (isNotFound(error)) return;
      throw new VideoProviderError(
        'não consegui fechar o palco',
        this.name,
        error,
      );
    }
  }

  /**
   * Traduz qualquer falha da AWS para o erro desta camada, com uma frase que
   * diz o que estava sendo tentado. Quem chama não deveria precisar conhecer
   * o vocabulário de exceção do fornecedor.
   */
  private async tentar<T>(acao: () => Promise<T>, erro: string): Promise<T> {
    try {
      return await acao();
    } catch (error) {
      throw new VideoProviderError(erro, this.name, error);
    }
  }
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name: string }).name === 'ResourceNotFoundException'
  );
}
