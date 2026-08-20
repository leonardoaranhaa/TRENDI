import { createRealtimeServer } from './server.js';

const port = Number(process.env['REALTIME_PORT'] ?? 3002);

createRealtimeServer({ port });
console.log(`realtime ouvindo em ws://localhost:${port}`);
