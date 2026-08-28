import { db } from '@trendi/db';
import { createRealtimeServer } from './server.js';
import { ouvirEstadoDosDuelos } from './ouvinte-de-estado.js';

const port = Number(process.env['REALTIME_PORT'] ?? 3002);
const ticketSecret = process.env['REALTIME_TICKET_SECRET'];

if (process.env['NODE_ENV'] === 'production' && (ticketSecret === undefined || ticketSecret === '')) {
  throw new Error('REALTIME_TICKET_SECRET é obrigatória em produção');
}

const log = (evento: Record<string, unknown>) =>
  console.log(JSON.stringify({ ...evento, at: new Date().toISOString() }));

const servidor = createRealtimeServer({
  port,
  prisma: db(),
  ticketSecret: ticketSecret ?? 'segredo-de-desenvolvimento',
  log,
});

// O aviso de mudança de estado vem pelo Postgres, da API (C-38). Sem ele, a
// janela de votação abriria na tela de cada pessoa em momento diferente.
const connectionString = process.env['DATABASE_URL'];
if (connectionString === undefined || connectionString === '') {
  throw new Error('DATABASE_URL é obrigatória: é por ela que o aviso de estado chega');
}

const ouvinte = ouvirEstadoDosDuelos({
  connectionString,
  aoMudarEstado: (duelId, state) => servidor.publishState(duelId, state),
  log,
});

for (const sinal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sinal, () => {
    void Promise.all([ouvinte.fechar(), servidor.close()]).then(() => process.exit(0));
  });
}

console.log(`realtime ouvindo em ws://localhost:${port}`);
