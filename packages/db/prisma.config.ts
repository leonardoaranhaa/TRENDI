import { defineConfig } from 'prisma/config';

/**
 * Configuração do Prisma CLI. No Prisma 7 a URL do banco não mora mais no
 * schema: fica aqui para as ferramentas, e o cliente em runtime recebe um
 * adapter (ver src/client.ts).
 *
 * Sem DATABASE_URL, os comandos que não tocam o banco — `validate`,
 * `generate`, `migrate diff` entre schemas — continuam funcionando.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: process.env['DATABASE_URL'] ?? '' },
});
