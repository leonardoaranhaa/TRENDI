import type { IVSRealTimeClient } from '@aws-sdk/client-ivs-realtime';
import { describe, expect, it } from 'vitest';
import { IvsVideoProvider, type IvsVideoProviderConfig } from './ivs-provider.js';
import { VideoProviderError } from './provider.js';

/**
 * O que estes testes cobrem: a **tradução** entre o contrato da TRENDI e o
 * vocabulário do IVS — que comando é enviado, com que parâmetros, e o que
 * volta para quem chamou.
 *
 * O que eles **não** cobrem: a AWS de verdade. A conta só existe depois de
 * `L-19`, e até lá esta classe nunca falou com o serviço. Rodar isto verde
 * não prova que o IVS aceita estes parâmetros — prova que mandamos o que
 * pretendíamos mandar.
 */

const CONFIG: IvsVideoProviderConfig = {
  channelArn: 'arn:aws:ivs:sa-east-1:1:channel/plateia',
  encoderConfigurationArn: 'arn:aws:ivs:sa-east-1:1:encoder-configuration/hd',
  storageConfigurationArn: 'arn:aws:ivs:sa-east-1:1:storage-configuration/gravacoes',
  playbackUrl: 'https://plateia.trendi.test/index.m3u8',
};

interface Enviado {
  nome: string;
  input: Record<string, unknown>;
}

/** Cliente de mentira que só anota o que recebeu. */
function clienteFalso(respostas: Record<string, unknown>, erro?: Error) {
  const enviados: Enviado[] = [];
  const client = {
    send(command: { constructor: { name: string }; input: Record<string, unknown> }) {
      enviados.push({ nome: command.constructor.name, input: command.input });
      if (erro !== undefined) return Promise.reject(erro);
      return Promise.resolve(respostas[command.constructor.name] ?? {});
    },
  } as unknown as IVSRealTimeClient;

  return { client, enviados };
}

describe('abrir o palco', () => {
  it('cria o stage marcado com o duelo', async () => {
    const { client, enviados } = clienteFalso({
      CreateStageCommand: { stage: { arn: 'arn:stage:1' } },
    });

    const palco = await new IvsVideoProvider(client, CONFIG).createStage('duelo-7');

    expect(palco).toEqual({ stageId: 'arn:stage:1', playbackUrl: null });
    expect(enviados[0]?.nome).toBe('CreateStageCommand');
    expect(enviados[0]?.input).toMatchObject({
      name: 'trendi-duelo-duelo-7',
      tags: { duelId: 'duelo-7' },
    });
  });

  it('reclama se o IVS devolver palco sem ARN', async () => {
    const { client } = clienteFalso({ CreateStageCommand: { stage: {} } });

    await expect(new IvsVideoProvider(client, CONFIG).createStage('duelo-7')).rejects.toThrow(
      /sem ARN/,
    );
  });
});

describe('credencial de publicação', () => {
  it('leva o lado como atributo — é assim que a composição sabe quem é quem', async () => {
    const expiracao = new Date('2026-08-20T23:00:00Z');
    const { client, enviados } = clienteFalso({
      CreateParticipantTokenCommand: { participantToken: { token: 'tok-a', expirationTime: expiracao } },
    });

    const credencial = await new IvsVideoProvider(client, CONFIG).issuePublishCredential(
      'arn:stage:1',
      'a',
    );

    expect(credencial).toMatchObject({ side: 'a', token: 'tok-a', expiresAt: expiracao });
    expect(enviados[0]?.input).toMatchObject({
      stageArn: 'arn:stage:1',
      attributes: { side: 'a' },
      capabilities: ['PUBLISH', 'SUBSCRIBE'],
      duration: 10,
    });
  });

  it('respeita a validade configurada', async () => {
    const { client, enviados } = clienteFalso({
      CreateParticipantTokenCommand: { participantToken: { token: 'tok' } },
    });

    await new IvsVideoProvider(client, {
      ...CONFIG,
      publishTokenDurationMinutes: 3,
    }).issuePublishCredential('arn:stage:1', 'b');

    expect(enviados[0]?.input).toMatchObject({ duration: 3 });
  });
});

describe('composição', () => {
  it('manda o quadro para a plateia e para a gravação', async () => {
    const { client, enviados } = clienteFalso({
      StartCompositionCommand: { composition: { arn: 'arn:comp:1' } },
    });

    const composicao = await new IvsVideoProvider(client, CONFIG).startComposition('arn:stage:1');

    expect(composicao).toEqual({
      compositionId: 'arn:comp:1',
      playbackUrl: CONFIG.playbackUrl,
    });

    const destinos = enviados[0]?.input['destinations'] as { name: string }[];
    expect(destinos.map((d) => d.name)).toEqual(['plateia', 'gravacao']);
  });

  it('usa grade — que é o split-screen — sem sumir com quem caiu', async () => {
    const { client, enviados } = clienteFalso({
      StartCompositionCommand: { composition: { arn: 'arn:comp:1' } },
    });

    await new IvsVideoProvider(client, CONFIG).startComposition('arn:stage:1');

    expect(enviados[0]?.input['layout']).toMatchObject({
      grid: { omitStoppedVideo: false, gridGap: 0 },
    });
  });

  it('fixa o lado pelo atributo do participante — A à esquerda, sempre', async () => {
    const { client, enviados } = clienteFalso({
      StartCompositionCommand: { composition: { arn: 'arn:comp:1' } },
    });

    await new IvsVideoProvider(client, CONFIG).startComposition('arn:stage:1');

    // Sem isto a ordem seria a de chegada ao palco, e o lado A apareceria à
    // esquerda num duelo e à direita no seguinte. O atributo é o mesmo que a
    // credencial de publicação grava.
    expect(enviados[0]?.input['layout']).toMatchObject({
      grid: { participantOrderAttribute: 'side' },
    });
  });

  it('preenche o lado cortando, em vez de deixar tarja preta', async () => {
    const { client, enviados } = clienteFalso({
      StartCompositionCommand: { composition: { arn: 'arn:comp:1' } },
    });

    await new IvsVideoProvider(client, CONFIG).startComposition('arn:stage:1');

    expect(enviados[0]?.input['layout']).toMatchObject({
      grid: { videoFillMode: 'COVER', videoAspectRatio: 'VIDEO' },
    });
  });

  it('desliga pelo ARN da composição', async () => {
    const { client, enviados } = clienteFalso({ StopCompositionCommand: {} });

    const gravacao = await new IvsVideoProvider(client, CONFIG).stopComposition('arn:comp:1');

    expect(enviados[0]?.nome).toBe('StopCompositionCommand');
    expect(enviados[0]?.input).toMatchObject({ arn: 'arn:comp:1' });
    // A gravação fecha de forma assíncrona no IVS: quem monta clipe lê do S3.
    expect(gravacao).toBeNull();
  });
});

describe('quando a AWS reclama', () => {
  it('traduz a falha para o erro desta camada, dizendo o que se tentava', async () => {
    const { client } = clienteFalso({}, new Error('ValidationException'));

    const erro = await new IvsVideoProvider(client, CONFIG)
      .createStage('duelo-7')
      .catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(VideoProviderError);
    expect((erro as VideoProviderError).message).toMatch(/palco do duelo/);
    expect((erro as VideoProviderError).provider).toBe('ivs');
    expect((erro as VideoProviderError).cause).toBeInstanceOf(Error);
  });

  it('trata palco inexistente como palco fechado', async () => {
    const naoAchou = Object.assign(new Error('some'), { name: 'ResourceNotFoundException' });
    const { client } = clienteFalso({}, naoAchou);

    // Idempotência: cancelar duas vezes não pode explodir.
    await expect(
      new IvsVideoProvider(client, CONFIG).closeStage('arn:stage:sumiu'),
    ).resolves.toBeUndefined();
  });

  it('propaga falha de verdade ao fechar o palco', async () => {
    const { client } = clienteFalso({}, new Error('AccessDeniedException'));

    await expect(new IvsVideoProvider(client, CONFIG).closeStage('arn:stage:1')).rejects.toThrow(
      VideoProviderError,
    );
  });
});
