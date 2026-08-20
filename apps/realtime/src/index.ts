import { db } from '@trendi/db';
import { createRealtimeServer } from './server.js';

const port = Number(process.env['REALTIME_PORT'] ?? 3002);
const ticketSecret = process.env['REALTIME_TICKET_SECRET'];

if (process.env['NODE_ENV'] === 'production' && (ticketSecret === undefined || ticketSecret === '')) {
  throw new Error('REALTIME_TICKET_SECRET é obrigatória em produção');
}

createRealtimeServer({
  port,
  prisma: db(),
  ticketSecret: ticketSecret ?? 'segredo-de-desenvolvimento',
  log: (evento) => console.log(JSON.stringify({ ...evento, at: new Date().toISOString() })),
});

console.log(`realtime ouvindo em ws://localhost:${port}`);
