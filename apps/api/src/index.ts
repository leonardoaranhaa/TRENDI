import { db } from '@trendi/db';
import { loadConfig } from './config.js';
import { buildServer } from './server.js';
import { criarRelogio } from './duels/relogio.js';

const port = Number(process.env['PORT'] ?? 3001);
const host = process.env['HOST'] ?? '0.0.0.0';

const config = loadConfig();
const prisma = db();
const app = buildServer({ prisma, config });

// O relógio do duelo (C-40): sem ele, os prazos escritos em duel-state.ts
// existem e ninguém os aplica — e a votação nunca fecha sozinha.
const relogio = config.relogioEnabled
  ? criarRelogio({ prisma, log: (evento) => app.log.info(evento) })
  : null;

try {
  await app.listen({ port, host });
  app.log.info(
    { webOrigin: config.webOrigin, fakeProvider: config.fakeProviderEnabled, relogio: relogio !== null },
    'api pronta',
  );
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
