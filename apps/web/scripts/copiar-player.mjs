import { cp, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

/**
 * Põe os binários do player do IVS em `public/ivs` (C-06).
 *
 * O player carrega worker e wasm por URL, e servi-los daqui — em vez de
 * apontar para o CDN do fornecedor — evita que cada espectador dependa de um
 * terceiro para o vídeo abrir. São ~1,6 MB de binário: entram no build, não
 * no repositório.
 */

const require = createRequire(import.meta.url);
const origem = join(dirname(require.resolve('amazon-ivs-player')), 'assets');
const destino = new URL('../public/ivs/', import.meta.url);

const ARQUIVOS = ['amazon-ivs-wasmworker.min.js', 'amazon-ivs-wasmworker.min.wasm'];

await mkdir(destino, { recursive: true });
for (const arquivo of ARQUIVOS) {
  await cp(join(origem, arquivo), new URL(arquivo, destino));
}

console.log(`player do IVS copiado para public/ivs (${ARQUIVOS.length} arquivos)`);
