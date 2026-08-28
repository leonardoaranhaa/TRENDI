import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.js';

export { PrismaClient };
export type { User, Account, Session, Duel, Challenge } from './generated/prisma/client.js';

/**
 * Cliente do banco.
 *
 * No Prisma 7 a conexão entra por adapter, não pelo schema — por isso a URL
 * é parâmetro aqui e `prisma.config.ts` só serve às ferramentas de linha de
 * comando. Ver decisão D-13.
 */
export function createPrismaClient(connectionString?: string): PrismaClient {
  const url = connectionString ?? process.env['DATABASE_URL'];
  if (url === undefined || url === '') {
    throw new Error('DATABASE_URL não definida — ver .env.example');
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}

let shared: PrismaClient | undefined;

/** Cliente compartilhado do processo. Um pool só, criado na primeira chamada. */
export function db(): PrismaClient {
  shared ??= createPrismaClient();
  return shared;
}
