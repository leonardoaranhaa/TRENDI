import { db } from '@trendi/db';
import { loadConfig } from './config.js';
import { buildServer } from './server.js';

const port = Number(process.env['PORT'] ?? 3001);
const host = process.env['HOST'] ?? '0.0.0.0';

const config = loadConfig();
const app = buildServer({ prisma: db(), config });

try {
  await app.listen({ port, host });
  app.log.info(
    { webOrigin: config.webOrigin, fakeProvider: config.fakeProviderEnabled },
    'api pronta',
  );
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
