import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

const CREATOR_A = '00000000-0000-0000-0000-00000000000a';
const CREATOR_B = '00000000-0000-0000-0000-00000000000b';
const VIEWER = '00000000-0000-0000-0000-000000000031';
const DUEL = '00000000-0000-0000-0000-0000000000d1';

async function applyMigrations(db: PGlite): Promise<string[]> {
  const files = (await readdir(migrationsDir)).filter((name) => name.endsWith('.sql')).sort();
  for (const file of files) {
    await db.exec(await readFile(join(migrationsDir, file), 'utf8'));
  }
  return files;
}

/** Um duelo mínimo, para os testes de constraint terem em que se apoiar. */
async function seedDuel(db: PGlite): Promise<void> {
  await db.exec(`
    INSERT INTO users (id, handle, email) VALUES
      ('${CREATOR_A}', 'criador_a', 'a@trendi.test'),
      ('${CREATOR_B}', 'criador_b', 'b@trendi.test'),
      ('${VIEWER}', 'espectador', 'v@trendi.test');
    INSERT INTO duels (id, creator_a, creator_b, state) VALUES
      ('${DUEL}', '${CREATOR_A}', '${CREATOR_B}', 'voting');
  `);
}

describe('migrations', () => {
  it('aplicam num Postgres limpo', async () => {
    const db = new PGlite();
    const files = await applyMigrations(db);

    expect(files.length).toBeGreaterThan(0);
    const tables = await db.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' ORDER BY table_name`,
    );
    expect(tables.rows.map((row) => row.table_name)).toContain('result_votes');
    await db.close();
  });

  it('garantem uma conta, um voto', async () => {
    const db = new PGlite();
    await applyMigrations(db);
    await seedDuel(db);

    const vote = (votedFor: 'a' | 'b') =>
      db.query(
        `INSERT INTO result_votes (duel_id, user_id, voted_for, stand)
         VALUES ('${DUEL}', '${VIEWER}', '${votedFor}', 'general')`,
      );

    await vote('a');
    await expect(vote('b')).rejects.toThrow();

    await db.close();
  });

  it('não deixam o duelo ser contra si mesmo', async () => {
    const db = new PGlite();
    await applyMigrations(db);
    await seedDuel(db);

    await expect(
      db.query(
        `INSERT INTO duels (id, creator_a, creator_b, state)
         VALUES ('00000000-0000-0000-0000-0000000000d2', '${CREATOR_A}', '${CREATOR_A}', 'queued')`,
      ),
    ).rejects.toThrow();

    await db.close();
  });

  it('recusam estado de duelo fora da máquina de estados', async () => {
    const db = new PGlite();
    await applyMigrations(db);
    await seedDuel(db);

    await expect(
      db.query(
        `INSERT INTO duels (id, creator_a, creator_b, state)
         VALUES ('00000000-0000-0000-0000-0000000000d3', '${CREATOR_A}', '${CREATOR_B}', 'pausado')`,
      ),
    ).rejects.toThrow();

    await db.close();
  });

  it('não deixam o voto de resultado ter coluna de peso pago — decisão D-03', async () => {
    const db = new PGlite();
    await applyMigrations(db);

    const columns = await db.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'result_votes'`,
    );
    const names = columns.rows.map((row) => row.column_name);
    for (const forbidden of ['weight', 'price', 'amount', 'gift_id', 'paid']) {
      expect(names).not.toContain(forbidden);
    }

    await db.close();
  });
});
