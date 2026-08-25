import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { DUEL_STATE_CHANNEL, parseDuelStateNotice, type DuelState } from '@trendi/shared';
import { startTestDatabase, type TestDatabase } from '@trendi/db/testing';
import { ouvirEstadoDosDuelos } from './ouvinte-de-estado.js';

/**
 * O ouvinte do aviso de estado (C-38).
 *
 * Duas camadas, testadas separado. A leitura do recado é pura e roda sempre.
 * O `LISTEN` de verdade precisa de **Postgres de verdade**: o PGlite que
 * atende os testes sem `DATABASE_URL` não encaminha notificação assíncrona
 * pelo socket — foi medido, não suposto. Em vez de fingir que passou, a
 * suíte diz que não rodou; no CI (que sobe `postgres:17`) ela roda.
 */

const COM_POSTGRES = (process.env['DATABASE_URL'] ?? '') !== '';

describe('ler o recado do canal', () => {
  it('entende o aviso que a API manda', () => {
    expect(parseDuelStateNotice('{"duelId":"d1","state":"voting"}')).toEqual({
      duelId: 'd1',
      state: 'voting',
    });
  });

  it('recusa o que não é aviso, em vez de estourar', () => {
    // `NOTIFY` rodado à mão no banco não pode derrubar o tempo real.
    for (const lixo of ['', 'nada disso', '[]', '{}', '{"duelId":"d1"}', undefined]) {
      expect(parseDuelStateNotice(lixo)).toBeNull();
    }
  });

  it('recusa estado que não existe no ciclo do duelo', () => {
    expect(parseDuelStateNotice('{"duelId":"d1","state":"campeao"}')).toBeNull();
  });
});

describe.skipIf(!COM_POSTGRES)('escutando o Postgres de verdade', () => {
  let database: TestDatabase;

  beforeAll(async () => {
    database = await startTestDatabase();
  });

  afterAll(async () => {
    await database.close();
  });

  it('recebe o aviso e repassa para quem manda na sala', async () => {
    const recebidos: Array<{ duelId: string; state: DuelState }> = [];
    const ouvinte = ouvirEstadoDosDuelos({
      connectionString: database.connectionString,
      aoMudarEstado: (duelId, state) => recebidos.push({ duelId, state }),
    });

    const emissor = new pg.Client({ connectionString: database.connectionString });
    await emissor.connect();

    // Esperar o LISTEN estar de pé antes de disparar: NOTIFY não guarda
    // recado para quem ainda não chegou.
    await expect.poll(async () => {
      await emissor.query(
        `SELECT pg_notify('${DUEL_STATE_CHANNEL}', '{"duelId":"d1","state":"voting"}')`,
      );
      return recebidos.length;
    }).toBeGreaterThan(0);

    expect(recebidos[0]).toEqual({ duelId: 'd1', state: 'voting' });

    await emissor.end();
    await ouvinte.fechar();
  });

  it('ignora aviso ilegível e continua escutando', async () => {
    const recebidos: string[] = [];
    const ouvinte = ouvirEstadoDosDuelos({
      connectionString: database.connectionString,
      aoMudarEstado: (duelId) => recebidos.push(duelId),
    });

    const emissor = new pg.Client({ connectionString: database.connectionString });
    await emissor.connect();

    await expect.poll(async () => {
      await emissor.query(`SELECT pg_notify('${DUEL_STATE_CHANNEL}', 'isto não é json')`);
      await emissor.query(
        `SELECT pg_notify('${DUEL_STATE_CHANNEL}', '{"duelId":"depois","state":"result"}')`,
      );
      return recebidos.length;
    }).toBeGreaterThan(0);

    // O lixo não entrou, e o aviso seguinte entrou: o ouvinte não morreu.
    expect(recebidos).not.toContain('isto não é json');
    expect(recebidos).toContain('depois');

    await emissor.end();
    await ouvinte.fechar();
  });
});
