import { describe, expect, it } from 'vitest';
import { FakeVideoProvider, PUBLISH_CREDENTIAL_TTL_MS } from './fake-provider.js';
import { VideoProviderError } from './provider.js';

const DUELO = 'duelo-1';

describe('ciclo de vida do palco', () => {
  it('abre o palco sem reprodução — ela só existe com a composição no ar', async () => {
    const video = new FakeVideoProvider();
    const palco = await video.createStage(DUELO);

    expect(palco.stageId).toBeTruthy();
    expect(palco.playbackUrl).toBeNull();
  });

  it('emite uma credencial por lado, e elas são diferentes', async () => {
    const video = new FakeVideoProvider();
    const { stageId } = await video.createStage(DUELO);

    const a = await video.issuePublishCredential(stageId, 'a');
    const b = await video.issuePublishCredential(stageId, 'b');

    expect(a.side).toBe('a');
    expect(b.side).toBe('b');
    expect(a.token).not.toBe(b.token);
  });

  it('dá prazo curto à credencial — ela é para entrar, não para guardar', async () => {
    const agora = 1_700_000_000_000;
    const video = new FakeVideoProvider({ now: () => agora });
    const { stageId } = await video.createStage(DUELO);

    const credencial = await video.issuePublishCredential(stageId, 'a');
    expect(credencial.expiresAt.getTime()).toBe(agora + PUBLISH_CREDENTIAL_TTL_MS);
  });

  it('liga a composição e passa a ter onde assistir', async () => {
    const video = new FakeVideoProvider();
    const { stageId } = await video.createStage(DUELO);

    const composicao = await video.startComposition(stageId);

    expect(composicao.compositionId).toBeTruthy();
    expect(composicao.playbackUrl).toContain('.m3u8');
  });

  it('devolve a gravação ao desligar, com a duração do que rodou', async () => {
    let agora = 1_700_000_000_000;
    const video = new FakeVideoProvider({ now: () => agora });
    const { stageId } = await video.createStage(DUELO);
    const { compositionId } = await video.startComposition(stageId);

    agora += 90_000;
    const gravacao = await video.stopComposition(compositionId);

    expect(gravacao?.durationS).toBe(90);
    expect(gravacao?.url).toContain(compositionId);
  });

  it('fecha o palco', async () => {
    const video = new FakeVideoProvider();
    const { stageId } = await video.createStage(DUELO);

    await video.closeStage(stageId);

    expect(video.isOpen(stageId)).toBe(false);
  });

  it('fecha duas vezes sem reclamar — duelo cancelado chama de novo', async () => {
    const video = new FakeVideoProvider();
    const { stageId } = await video.createStage(DUELO);

    await video.closeStage(stageId);
    await expect(video.closeStage(stageId)).resolves.toBeUndefined();
    await expect(video.closeStage('palco-que-nunca-existiu')).resolves.toBeUndefined();
  });
});

describe('o que o contrato não deixa passar', () => {
  it('não emite credencial para palco desconhecido', async () => {
    const video = new FakeVideoProvider();
    await expect(video.issuePublishCredential('nao-existe', 'a')).rejects.toThrow(
      VideoProviderError,
    );
  });

  it('não emite credencial para palco já fechado', async () => {
    const video = new FakeVideoProvider();
    const { stageId } = await video.createStage(DUELO);
    await video.closeStage(stageId);

    await expect(video.issuePublishCredential(stageId, 'a')).rejects.toThrow(/encerrado/);
  });

  it('não liga a composição duas vezes', async () => {
    const video = new FakeVideoProvider();
    const { stageId } = await video.createStage(DUELO);
    await video.startComposition(stageId);

    await expect(video.startComposition(stageId)).rejects.toThrow(/já está no ar/);
  });

  it('religa a composição depois de desligada — queda no meio do duelo', async () => {
    const video = new FakeVideoProvider();
    const { stageId } = await video.createStage(DUELO);
    const primeira = await video.startComposition(stageId);
    await video.stopComposition(primeira.compositionId);

    const segunda = await video.startComposition(stageId);
    expect(segunda.compositionId).not.toBe(primeira.compositionId);
  });

  it('não desliga composição que não existe', async () => {
    const video = new FakeVideoProvider();
    await expect(video.stopComposition('comp-inventada')).rejects.toThrow(/desconhecida/);
  });
});
