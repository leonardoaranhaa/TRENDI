/**
 * O player da plateia, isolado num arquivo só (C-06).
 *
 * Mesmo desenho do `ivs-cliente.ts` da C-04, pelos mesmos dois motivos. Peso:
 * o SDK entra por `import()` dinâmico, então quem abre a home ou o perfil não
 * baixa player nenhum. E a decisão D-20, que já nasceu com gatilho de revisão
 * escrito — trocar de fornecedor deve tocar este arquivo, não o estádio.
 *
 * O player do IVS entende LL-HLS de verdade, que é o que segura a latência de
 * quem assiste. Isso importa aqui: o voto é sobre o que a plateia viu, e
 * latência alta é plateia julgando outro instante.
 *
 * ⚠️ Nunca foi exercitado contra a AWS: não há `playbackUrl` até `L-19`. Até
 * lá o estádio mostra o aviso de que não há vídeo saindo de lugar nenhum.
 */

/** Os binários do player, servidos por nós — ver o `prebuild` do @trendi/web. */
const ASSETS = '/ivs';

export interface PlayerDoDuelo {
  /** Desliga e devolve os recursos. Player esquecido vaza worker e wasm. */
  destruir(): void;
}

export async function tocar(
  video: HTMLVideoElement,
  playbackUrl: string,
): Promise<PlayerDoDuelo> {
  const IVSPlayer = await import('amazon-ivs-player');

  if (!IVSPlayer.isPlayerSupported) {
    throw new Error('player_nao_suportado');
  }

  const player = IVSPlayer.create({
    wasmWorker: `${ASSETS}/amazon-ivs-wasmworker.min.js`,
    wasmBinary: `${ASSETS}/amazon-ivs-wasmworker.min.wasm`,
  });

  player.attachHTMLVideoElement(video);
  player.setAutoplay(true);
  player.load(playbackUrl);

  return {
    destruir() {
      player.delete();
    },
  };
}
