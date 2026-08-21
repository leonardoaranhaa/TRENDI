import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/**
 * Banco para testes.
 *
 * Em CI (e em qualquer máquina com Docker) `DATABASE_URL` aponta para um
 * Postgres de verdade. Sem ele, sobe um PGlite — Postgres em WebAssembly —
 * exposto num socket TCP, que é o que permite rodar os mesmos testes numa
 * máquina sem Docker nenhum.
 */

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'prisma', 'migrations');

export interface TestDatabase {
  readonly connectionString: string;
  close(): Promise<void>;
}

/** O SQL de todas as migrations, na ordem em que devem ser aplicadas. */
export async function migrationScripts(): Promise<{ name: string; sql: string }[]> {
  const names = (await readdir(migrationsDir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  return Promise.all(
    names.map(async (name) => ({
      name,
      sql: await readFile(join(migrationsDir, name, 'migration.sql'), 'utf8'),
    })),
  );
}

/** Sobe um banco limpo, com todas as migrations aplicadas. */
export async function startTestDatabase(): Promise<TestDatabase> {
  const external = process.env['DATABASE_URL'];
  if (external !== undefined && external !== '') return useExternalPostgres(external);
  return usePGlite();
}

async function useExternalPostgres(adminUrl: string): Promise<TestDatabase> {
  const { default: pg } = await import('pg');

  // Cada suíte ganha um banco próprio, não um schema: `?schema=` na URL é
  // coisa do Prisma, e o driver `pg` ignora — as duas metades do teste
  // acabariam olhando para lugares diferentes. Nome de banco os dois
  // entendem igual.
  const name = `trendi_test_${Math.random().toString(36).slice(2, 10)}`;

  const admin = new pg.Client({ connectionString: adminUrl });
  await admin.connect();
  await admin.query(`CREATE DATABASE "${name}"`);
  await admin.end();

  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  const connectionString = url.toString();

  const client = new pg.Client({ connectionString });
  await client.connect();
  for (const migration of await migrationScripts()) await client.query(migration.sql);
  await client.end();

  return {
    connectionString,
    async close() {
      const cleanup = new pg.Client({ connectionString: adminUrl });
      await cleanup.connect();
      // Conexão que ficou aberta impede o DROP; WITH (FORCE) resolve.
      await cleanup.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
      await cleanup.end();
    },
  };
}

async function usePGlite(): Promise<TestDatabase> {
  const { PGlite } = await import('@electric-sql/pglite');
  const { PGLiteSocketServer } = await import('@electric-sql/pglite-socket');

  const db = await PGlite.create();
  for (const migration of await migrationScripts()) await db.exec(migration.sql);

  // maxConnections acompanha o pool do Prisma: o padrão do socket é 1, e uma
  // conexão só faria o cliente esperar para sempre na segunda query.
  const port = 5433 + Math.floor(Math.random() * 500);
  const server = new PGLiteSocketServer({ db, port, host: '127.0.0.1', maxConnections: 20 });
  await server.start();

  return {
    connectionString: `postgresql://postgres:postgres@127.0.0.1:${port}/postgres`,
    async close() {
      await server.stop();
      await db.close();
    },
  };
}
