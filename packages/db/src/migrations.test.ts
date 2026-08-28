import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrationScripts, startTestDatabase, type TestDatabase } from './testing.js';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

let database: TestDatabase;
let client: pg.Client;

beforeAll(async () => {
  database = await startTestDatabase();
  client = new pg.Client({ connectionString: database.connectionString });
  await client.connect();
});

afterAll(async () => {
  await client.end();
  await database.close();
});

const CREATOR_A = '00000000-0000-0000-0000-00000000000a';
const CREATOR_B = '00000000-0000-0000-0000-00000000000b';
const VIEWER = '00000000-0000-0000-0000-000000000031';
const DUEL = '00000000-0000-0000-0000-0000000000d1';

async function seedDuel(): Promise<void> {
  await client.query(`
    INSERT INTO users (id, handle, email) VALUES
      ('${CREATOR_A}', 'criador_a', 'a@trendi.test'),
      ('${CREATOR_B}', 'criador_b', 'b@trendi.test'),
      ('${VIEWER}', 'espectador', 'v@trendi.test')
    ON CONFLICT DO NOTHING;
    INSERT INTO duels (id, creator_a, creator_b, state) VALUES
      ('${DUEL}', '${CREATOR_A}', '${CREATOR_B}', 'voting')
    ON CONFLICT DO NOTHING;
  `);
}

async function columnsOf(table: string): Promise<string[]> {
  const result = await client.query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
    [table],
  );
  return result.rows.map((row) => row.column_name);
}

describe('migrations', () => {
  it('aplicam num Postgres limpo', async () => {
    expect((await migrationScripts()).length).toBeGreaterThan(0);

    const tables = await client.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
        WHERE table_schema = current_schema() ORDER BY table_name`,
    );
    expect(tables.rows.map((row) => row.table_name)).toEqual(
      expect.arrayContaining(['users', 'accounts', 'sessions', 'duels', 'result_votes']),
    );
  });

  it('não deriva do schema.prisma', async () => {
    // Sai 0 quando o banco criado pelas migrations bate com o schema, e 2
    // quando alguém mexeu num lado só. É o que impede o schema e as
    // migrations contarem histórias diferentes.
    //
    // Precisa ser assíncrono: quando o banco é o PGlite, quem atende o
    // socket é este mesmo processo, e uma chamada síncrona travaria o event
    // loop justamente enquanto o Prisma tenta conectar.
    const { stdout } = await promisify(execFile)(
      'npx',
      [
        'prisma',
        'migrate',
        'diff',
        '--from-config-datasource',
        '--to-schema',
        'prisma/schema.prisma',
        '--exit-code',
      ],
      {
        cwd: packageRoot,
        env: { ...process.env, DATABASE_URL: database.connectionString },
      },
    );

    expect(stdout).toContain('No difference detected');
  });

  it('garantem uma conta, um voto', async () => {
    await seedDuel();
    const votar = (votedFor: 'a' | 'b') =>
      client.query(
        `INSERT INTO result_votes (duel_id, user_id, voted_for, stand)
         VALUES ('${DUEL}', '${VIEWER}', '${votedFor}', 'general')`,
      );

    await votar('a');
    await expect(votar('b')).rejects.toThrow();
  });

  it('não deixam o duelo ser contra si mesmo', async () => {
    await seedDuel();
    await expect(
      client.query(
        `INSERT INTO duels (id, creator_a, creator_b, state)
         VALUES ('00000000-0000-0000-0000-0000000000d2', '${CREATOR_A}', '${CREATOR_A}', 'queued')`,
      ),
    ).rejects.toThrow();
  });

  it('recusam estado de duelo fora da máquina de estados', async () => {
    await seedDuel();
    await expect(
      client.query(
        `INSERT INTO duels (id, creator_a, creator_b, state)
         VALUES ('00000000-0000-0000-0000-0000000000d3', '${CREATOR_A}', '${CREATOR_B}', 'pausado')`,
      ),
    ).rejects.toThrow();
  });

  it('não deixam o voto de resultado ter coluna de peso pago — decisão D-03', async () => {
    const colunas = await columnsOf('result_votes');
    for (const proibida of ['weight', 'price', 'amount', 'gift_id', 'paid']) {
      expect(colunas).not.toContain(proibida);
    }
  });

  it('não guardam idade nem biometria — L-02 e C-24 ainda travadas', async () => {
    // C-24 (estimativa de idade) depende de L-08, que depende do parecer
    // jurídico. Até lá o CLAUDE.md proíbe coletar isso, e este teste é o que
    // impede a coluna aparecer de carona numa migration distraída.
    const colunas = await columnsOf('users');
    for (const proibida of [
      'birth_date',
      'birthdate',
      'age',
      'estimated_age',
      'age_band',
      'document',
      'cpf',
      'face_template',
      'biometric_template',
    ]) {
      expect(colunas).not.toContain(proibida);
    }
  });

  it('guardam hash de senha, nunca a senha — decisão D-19', async () => {
    const colunas = await columnsOf('users');

    // A conta nativa existe e tem senha (D-19 revisou a D-15). O que não
    // pode existir é coluna capaz de guardar a senha em claro.
    expect(colunas).toContain('password_hash');
    for (const proibida of ['password', 'password_plain', 'senha', 'password_clear']) {
      expect(colunas).not.toContain(proibida);
    }
  });

  it('guardam só o hash do token de e-mail e de recuperação', async () => {
    const colunas = await columnsOf('auth_tokens');

    expect(colunas).toContain('token_hash');
    expect(colunas).not.toContain('token');
  });
});

/**
 * O desafio da Fase 1 (C-10).
 *
 * Os valores vivem em dois lugares: no banco, semeados pela migração, e no
 * `01-conceito/catalogo-desafios.md`, que é onde a decisão de produto foi
 * escrita. Duplicação sem amarra vira divergência — então aqui a amarra.
 */
describe('o desafio da Fase 1', () => {
  it('está semeado, e é o da categoria Aura', async () => {
    const { rows } = await client.query(`SELECT * FROM challenges WHERE active`);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      category: 'aura',
      name: 'Aura',
      min_duration_s: 30,
      max_duration_s: 90,
      duration_options_s: [30, 60, 90],
      min_age: 0,
      // Sem material e sem música é o que tira este desafio do caminho da
      // licença — e é por isso que ele foi o escolhido para a Fase 1.
      needs_material: false,
      needs_music: false,
    });
  });

  it('bate com o que o catálogo descreve', async () => {
    const catalogo = readFileSync(join(packageRoot, '../../01-conceito/catalogo-desafios.md'), 'utf8');
    const { rows } = await client.query<{
      name: string;
      rules: string;
      judging_criteria: string;
      duration_options_s: number[];
    }>(`SELECT name, rules, judging_criteria, duration_options_s FROM challenges WHERE active`);
    const desafio = rows[0]!;

    // A regra e o critério, sem a primeira letra: o catálogo escreve em
    // minúscula depois de "Regra:", o banco começa a frase em maiúscula.
    expect(catalogo.toLowerCase()).toContain(desafio.rules.slice(1).toLowerCase().replace(/\.$/, ''));
    expect(catalogo.toLowerCase()).toContain('quem dominou a tela');
    for (const tempo of desafio.duration_options_s) {
      expect(catalogo).toContain(`${tempo}s`);
    }
  });
});

