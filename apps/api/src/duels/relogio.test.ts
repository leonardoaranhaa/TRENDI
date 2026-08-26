import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPrismaClient, type PrismaClient } from '@trendi/db';
import { startTestDatabase, type TestDatabase } from '@trendi/db/testing';
import { FakeVideoProvider } from '@trendi/video';
import { CHOICE_WINDOW_MS, MATCH_ACCEPT_MS, VOTING_WINDOW_MS } from '@trendi/shared';
import { criarRelogio } from './relogio.js';

/**
 * O relógio do duelo (C-40).
 *
 * O relógio é chamado à mão, com o instante que o teste escolhe: o serviço
 * já aceita `now` por parâmetro, então nada aqui espera de verdade.
 *
 * O que se verifica é o que a tarefa existe para resolver — que o duelo anda
 * **sem ninguém clicar** — e o que ela não pode quebrar: duelo dentro do
 * prazo fica onde está, e transição não acontece duas vezes.
 */

let database: TestDatabase;
let prisma: PrismaClient;
let video: FakeVideoProvider;

beforeAll(async () => {
  database = await startTestDatabase();
  prisma = createPrismaClient(database.connectionString);
  video = new FakeVideoProvider();
});

afterAll(async () => {
  await prisma.$disconnect();
  await database.close();
});

const AGORA = new Date('2026-08-25T21:00:00Z');

/** Um duelo posto num estado, parado desde um instante. */
async function duelo(state: string, paradoDesde: Date, extras: Record<string, unknown> = {}) {
  const [a, b] = await Promise.all([pessoa(), pessoa()]);
  return prisma.duel.create({
    data: {
      id: randomUUID(),
      creatorA: a,
      creatorB: b,
      state,
      stateEnteredAt: paradoDesde,
      ...extras,
    },
  });
}

async function pessoa(): Promise<string> {
  const user = await prisma.user.create({
    data: { id: randomUUID(), handle: `pessoa_${Math.random().toString(36).slice(2, 9)}` },
  });
  return user.id;
}

const relogio = () => criarRelogio({ prisma, video, intervaloMs: 0 });

function haQuanto(ms: number): Date {
  return new Date(AGORA.getTime() - ms);
}

describe('o duelo anda sem ninguém clicar', () => {
  it('encerra a votação e faz o placar sair', async () => {
    // A pior consequência de não haver relógio: a janela nunca fecha, e quem
    // encerra o julgamento acaba sendo um dos julgados.
    const duel = await duelo('voting', haQuanto(VOTING_WINDOW_MS.default + 1000));

    expect(await relogio().rodada(AGORA)).toBeGreaterThan(0);

    const depois = await prisma.duel.findUniqueOrThrow({ where: { id: duel.id } });
    expect(depois.state).toBe('result');
    expect(depois.endedAt).not.toBeNull();
  });

  it('derruba o pareamento que ninguém aceitou', async () => {
    const duel = await duelo('matched', haQuanto(MATCH_ACCEPT_MS + 1000));

    await relogio().rodada(AGORA);

    const depois = await prisma.duel.findUniqueOrThrow({ where: { id: duel.id } });
    expect(depois.state).toBe('cancelled');
  });

  it('grava a passagem como timeout, não como desistência', async () => {
    // Auditoria precisa distinguir quem desistiu de quem estourou o tempo:
    // desistência tem penalidade (C-17), tempo esgotado não.
    const duel = await duelo('choosing', haQuanto(CHOICE_WINDOW_MS + 1000));

    await relogio().rodada(AGORA);

    const passagens = await prisma.duelTransition.findMany({ where: { duelId: duel.id } });
    expect(passagens).toHaveLength(1);
    expect(passagens[0]!.event).toBe('timeout');
  });

  it('usa a duração do desafio na EXECUÇÃO — é o que a C-10 deu', async () => {
    const desafio = await prisma.challenge.findFirstOrThrow({ where: { active: true } });
    const dentro = await duelo('running', haQuanto(30_000), {
      challengeId: desafio.id,
      chosenDurationS: 60,
    });
    const fora = await duelo('running', haQuanto(61_000), {
      challengeId: desafio.id,
      chosenDurationS: 60,
    });

    await relogio().rodada(AGORA);

    expect((await prisma.duel.findUniqueOrThrow({ where: { id: dentro.id } })).state).toBe('running');
    expect((await prisma.duel.findUniqueOrThrow({ where: { id: fora.id } })).state).toBe('voting');
  });
});

describe('o que o relógio não pode fazer', () => {
  it('não mexe em duelo dentro do prazo', async () => {
    const duel = await duelo('choosing', haQuanto(CHOICE_WINDOW_MS - 5000));

    await relogio().rodada(AGORA);

    const depois = await prisma.duel.findUniqueOrThrow({ where: { id: duel.id } });
    expect(depois.state).toBe('choosing');
    expect(await prisma.duelTransition.count({ where: { duelId: duel.id } })).toBe(0);
  });

  it('não mexe em duelo que já acabou', async () => {
    const duel = await duelo('result', haQuanto(3_600_000));

    await relogio().rodada(AGORA);

    expect((await prisma.duel.findUniqueOrThrow({ where: { id: duel.id } })).state).toBe('result');
  });

  it('não move o mesmo duelo duas vezes, com dois relógios ao mesmo tempo', async () => {
    // Duas instâncias da API no ar. Sem a trava, as duas gravariam a
    // passagem — e auditoria com passagem duplicada é pior que auditoria
    // faltando.
    const duel = await duelo('preparing', haQuanto(60_000));

    const [um, outro] = await Promise.all([
      relogio().rodada(AGORA),
      relogio().rodada(AGORA),
    ]);

    expect(um + outro).toBe(1);
    expect(await prisma.duelTransition.count({ where: { duelId: duel.id } })).toBe(1);
  });
});
