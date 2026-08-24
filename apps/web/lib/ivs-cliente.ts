/**
 * O SDK do fornecedor de vídeo, isolado num arquivo só (C-04).
 *
 * Fica separado da tela por dois motivos. O primeiro é peso: o SDK entra por
 * `import()` dinâmico, então quem só assiste nunca baixa esse código. O
 * segundo é a decisão D-20, que já nasceu com gatilho de revisão — trocar de
 * fornecedor deve tocar este arquivo, não a tela do competidor.
 *
 * ⚠️ Nunca foi exercitado contra a AWS: a conta só existe depois de `L-19`.
 * Até lá a tela roda em modo local, e este caminho não é chamado.
 */

/** Publica o que a câmera capturou no palco do duelo. */
export async function publicar(token: string, stream: MediaStream | null): Promise<void> {
  if (stream === null) throw new Error('sem câmera para publicar');

  const IVSBroadcast = await import('amazon-ivs-web-broadcast');

  // O SDK não recebe as trilhas cruas: cada uma vira um stream dele, que é
  // quem sabe cortar e retomar sem derrubar a conexão.
  const trilhas = [...stream.getVideoTracks(), ...stream.getAudioTracks()].map(
    (trilha) => new IVSBroadcast.LocalStageStream(trilha),
  );

  const stage = new IVSBroadcast.Stage(token, {
    stageStreamsToPublish: () => trilhas,
    shouldPublishParticipant: () => true,
    // O competidor publica e não assina o outro lado: quem monta o
    // split-screen é a composição no servidor (D-01). Assinar o adversário
    // aqui só gastaria a banda de quem está no meio do duelo.
    shouldSubscribeToParticipant: () => IVSBroadcast.SubscribeType.NONE,
  });

  await stage.join();
}
