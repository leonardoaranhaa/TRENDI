import { randomUUID } from 'node:crypto';
import type { Side } from '@trendi/shared';
import type {
  CompositionHandle,
  LiveStage,
  PublishCredential,
  Recording,
  VideoProvider,
} from './provider.js';
import { VideoProviderError } from './provider.js';

/**
 * Fornecedor de mentira, para desenvolvimento e teste.
 *
 * Existe pelo mesmo motivo do provedor falso de OAuth: criar a conta AWS é
 * tarefa do mundo real (`L-19`), e o código não pode ficar parado esperando.
 * Ele guarda estado em memória e devolve URLs que não tocam rede nenhuma.
 *
 * Também é o que permite testar o que interessa de verdade — a ordem das
 * chamadas, o ciclo de vida do palco — sem depender de serviço externo, que
 * é lento, custa dinheiro e falha por motivo alheio ao teste.
 */

export const PUBLISH_CREDENTIAL_TTL_MS = 10 * 60 * 1000;

interface FakeStage {
  duelId: string;
  closed: boolean;
  compositionId: string | null;
  startedAt: number | null;
}

export interface FakeVideoProviderOptions {
  /** Relógio, para o teste conseguir medir duração sem esperar. */
  readonly now?: () => number;
}

export class FakeVideoProvider implements VideoProvider {
  readonly name = 'fake';
  private readonly stages = new Map<string, FakeStage>();
  private readonly compositions = new Map<string, string>();
  private readonly now: () => number;

  constructor(options: FakeVideoProviderOptions = {}) {
    this.now = options.now ?? (() => Date.now());
  }

  async createStage(duelId: string): Promise<LiveStage> {
    const stageId = `fake-stage-${randomUUID()}`;
    this.stages.set(stageId, { duelId, closed: false, compositionId: null, startedAt: null });
    return { stageId, playbackUrl: null };
  }

  async issuePublishCredential(stageId: string, side: Side): Promise<PublishCredential> {
    this.liveStage(stageId);
    return {
      side,
      token: `fake-token-${side}-${randomUUID()}`,
      expiresAt: new Date(this.now() + PUBLISH_CREDENTIAL_TTL_MS),
      ingestEndpoint: `https://fake.trendi.test/ingest/${stageId}`,
    };
  }

  async startComposition(stageId: string): Promise<CompositionHandle> {
    const stage = this.liveStage(stageId);
    if (stage.compositionId !== null) {
      throw new VideoProviderError('composição já está no ar', this.name);
    }

    const compositionId = `fake-comp-${randomUUID()}`;
    stage.compositionId = compositionId;
    stage.startedAt = this.now();
    this.compositions.set(compositionId, stageId);

    return {
      compositionId,
      playbackUrl: `https://fake.trendi.test/hls/${stageId}/index.m3u8`,
    };
  }

  async stopComposition(compositionId: string): Promise<Recording | null> {
    const stageId = this.compositions.get(compositionId);
    if (stageId === undefined) {
      throw new VideoProviderError(`composição desconhecida: ${compositionId}`, this.name);
    }

    const stage = this.stages.get(stageId);
    const startedAt = stage?.startedAt ?? this.now();
    if (stage !== undefined) {
      stage.compositionId = null;
      stage.startedAt = null;
    }
    this.compositions.delete(compositionId);

    return {
      recordingId: `fake-rec-${compositionId}`,
      url: `https://fake.trendi.test/gravacoes/${compositionId}.m3u8`,
      durationS: Math.max(0, Math.round((this.now() - startedAt) / 1000)),
    };
  }

  async closeStage(stageId: string): Promise<void> {
    const stage = this.stages.get(stageId);
    // Idempotente de propósito: duelo cancelado pode chamar duas vezes.
    if (stage !== undefined) stage.closed = true;
  }

  /** Só para os testes: o palco existe e está aberto? */
  isOpen(stageId: string): boolean {
    const stage = this.stages.get(stageId);
    return stage !== undefined && !stage.closed;
  }

  private liveStage(stageId: string): FakeStage {
    const stage = this.stages.get(stageId);
    if (stage === undefined) {
      throw new VideoProviderError(`palco desconhecido: ${stageId}`, this.name);
    }
    if (stage.closed) {
      throw new VideoProviderError(`palco já encerrado: ${stageId}`, this.name);
    }
    return stage;
  }
}
