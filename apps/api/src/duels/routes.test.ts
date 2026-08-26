import { randomUUID } from 'node:crypto';
import type { FastifyInstance, InjectOptions } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPrismaClient, createSession, type PrismaClient } from '@trendi/db';
import { startTestDatabase, type TestDatabase } from '@trendi/db/testing';
import { stateDurationMs } from '@trendi/shared';
import { loadConfig } from '../config.js';
import { buildServer } from '../server.js';
import { SESSION_COOKIE } from '../auth/session-cookie.js';

let database: TestDatabase;
let prisma: PrismaClient;
let app: FastifyInstance;

const config = loadConfig({ NODE_ENV: 'test', REALTIME_TICKET_SECRET: 'segredo-de-teste' });

beforeAll(async () => {
  database = await startTestDatabase();
  prisma = createPrismaClient(database.connectionString);
  app = buildServer({ prisma, config, logger: false });
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
  await database.close();
});

/** Uma pessoa com sessão aberta. */
async function pessoa(handle: string) {
  const user = await prisma.user.create({
    data: { id: randomUUID(), handle: `${handle}_${Math.random().toString(36).slice(2, 7)}` },
  });
  const { token } = await createSession(prisma, user.id);
  return { id: user.id, cookie: token };
}

async function duelo(estado = 'queued') {
  const [a, b] = await Promise.all([pessoa('criador_a'), pessoa('criador_b')]);
  const duel = await prisma.duel.create({
    data: { id: randomUUID(), creatorA: a.id, creatorB: b.id, state: estado },
  });
  return { duel, a, b };
}

function chamada(method: 'GET' | 'POST', url: string, cookie?: string, payload?: unknown) {
  const options: InjectOptions = {
    method,
    url,
    ...(payload === undefined ? {} : { payload: payload as Record<string, unknown> }),
    ...(cookie === undefined ? {} : { cookies: { [SESSION_COOKIE]: cookie } }),
  };
  return app.inject(options);
}

describe('mover o duelo', () => {
  it('anda pelo ciclo de vida e registra cada passagem', async () => {
    const { duel, a } = await duelo();

    for (const event of ['match_found', 'both_accepted'] as const) {
      const response = await chamada('POST', `/duels/${duel.id}/events`, a.cookie, { event });
      expect(response.statusCode).toBe(200);
    }

    const transicoes = await prisma.duelTransition.findMany({
      where: { duelId: duel.id },
      orderBy: { id: 'asc' },
    });

    // O ACEITE é instantâneo (regras do duelo, §1): o duelo passa por ele e
    // segue para a ESCOLHA sozinho. As duas passagens ficam registradas —
    // a do aceite é o ponto de não retorno, e sumir com ela seria perder o
    // que a penalidade usa como marco.
    expect(transicoes.map((t) => t.toState)).toEqual(['matched', 'accepted', 'choosing']);
    expect(transicoes.every((t) => t.abandonment === false)).toBe(true);
  });

  it('recusa evento fora de hora', async () => {
    const { duel, a } = await duelo();
    const response = await chamada('POST', `/duels/${duel.id}/events`, a.cookie, {
      event: 'voting_closed',
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error).toBe('transicao_invalida');
  });

  it('só os competidores movem o duelo', async () => {
    const { duel } = await duelo();
    const intruso = await pessoa('espectador');

    const response = await chamada('POST', `/duels/${duel.id}/events`, intruso.cookie, {
      event: 'match_found',
    });
    expect(response.statusCode).toBe(403);
  });

  it('registra desistência quando alguém sai depois do aceite', async () => {
    const { duel, a } = await duelo('accepted');

    const response = await chamada('POST', `/duels/${duel.id}/events`, a.cookie, {
      event: 'abandon',
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().duel.state).toBe('cancelled');

    const transicao = await prisma.duelTransition.findFirstOrThrow({ where: { duelId: duel.id } });
    expect(transicao.abandonment).toBe(true);
  });

  it('exige sessão', async () => {
    const { duel } = await duelo();
    const response = await chamada('POST', `/duels/${duel.id}/events`, undefined, {
      event: 'match_found',
    });
    expect(response.statusCode).toBe(401);
  });
});

describe('votar', () => {
  it('registra o voto durante a votação', async () => {
    const { duel } = await duelo('voting');
    const torcedor = await pessoa('torcedor');

    const response = await chamada('POST', `/duels/${duel.id}/votes`, torcedor.cookie, {
      votedFor: 'a',
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().stand).toBe('general');
  });

  it('usa a arquibancada de quem já estava na sala', async () => {
    const { duel } = await duelo('voting');
    const torcedor = await pessoa('torcedor_b');
    await prisma.attendance.create({
      data: { duelId: duel.id, userId: torcedor.id, stand: 'b' },
    });

    const response = await chamada('POST', `/duels/${duel.id}/votes`, torcedor.cookie, {
      votedFor: 'a',
    });

    // Torcedor de B votando em A: permitido e valorizado — é o voto que mais
    // vale quando o peso cruzado entrar (C-14).
    expect(response.json().stand).toBe('b');
  });

  it('uma conta, um voto', async () => {
    const { duel } = await duelo('voting');
    const torcedor = await pessoa('insistente');

    await chamada('POST', `/duels/${duel.id}/votes`, torcedor.cookie, { votedFor: 'a' });
    const segunda = await chamada('POST', `/duels/${duel.id}/votes`, torcedor.cookie, {
      votedFor: 'b',
    });

    expect(segunda.statusCode).toBe(409);
    expect(segunda.json().error).toBe('ja_votou');
    expect(await prisma.resultVote.count({ where: { duelId: duel.id } })).toBe(1);
  });

  it('não aceita voto fora da janela', async () => {
    const { duel } = await duelo('running');
    const torcedor = await pessoa('adiantado');

    const response = await chamada('POST', `/duels/${duel.id}/votes`, torcedor.cookie, {
      votedFor: 'a',
    });
    expect(response.statusCode).toBe(409);
    expect(response.json().error).toBe('votacao_fechada');
  });

  it('recusa voto em quem não está no duelo', async () => {
    const { duel } = await duelo('voting');
    const torcedor = await pessoa('confuso');

    const response = await chamada('POST', `/duels/${duel.id}/votes`, torcedor.cookie, {
      votedFor: 'c',
    });
    expect(response.statusCode).toBe(400);
  });

  it('exige sessão — é o que sustenta uma conta, um voto', async () => {
    const { duel } = await duelo('voting');
    const response = await chamada('POST', `/duels/${duel.id}/votes`, undefined, {
      votedFor: 'a',
    });
    expect(response.statusCode).toBe(401);
  });
});

describe('o que aparece durante e depois', () => {
  it('não mostra parcial enquanto a votação corre', async () => {
    const { duel } = await duelo('voting');
    const torcedor = await pessoa('curioso');
    await chamada('POST', `/duels/${duel.id}/votes`, torcedor.cookie, { votedFor: 'a' });

    const response = await chamada('GET', `/duels/${duel.id}`, torcedor.cookie);
    const { voting } = response.json();

    // Placar ao vivo empurraria quem ainda não votou para o lado que está
    // ganhando. Sai só o tamanho da plateia, e o próprio voto de quem pergunta.
    expect(voting.tally).toBeNull();
    expect(voting.voters).toBe(1);
    expect(voting.yourVote).toBe('a');
  });

  it('revela o placar quando o duelo chega em resultado', async () => {
    const { duel, a } = await duelo('voting');
    const [um, dois, tres] = await Promise.all([
      pessoa('v1'),
      pessoa('v2'),
      pessoa('v3'),
    ]);

    await chamada('POST', `/duels/${duel.id}/votes`, um.cookie, { votedFor: 'a' });
    await chamada('POST', `/duels/${duel.id}/votes`, dois.cookie, { votedFor: 'a' });
    await chamada('POST', `/duels/${duel.id}/votes`, tres.cookie, { votedFor: 'b' });

    const fechamento = await chamada('POST', `/duels/${duel.id}/events`, a.cookie, {
      event: 'voting_closed',
    });
    expect(fechamento.json().duel).toMatchObject({ state: 'result', winner: 'a' });

    const response = await chamada('GET', `/duels/${duel.id}`);
    const { duel: publicado, voting } = response.json();

    expect(voting.tally).toMatchObject({ forA: 2, forB: 1, voters: 3, winner: 'a' });
    expect(publicado.scoreA).toBeCloseTo(2 / 3, 4);
    // Três votantes não fazem ranking: o quórum são 30 (regras §4).
    expect(publicado.countsForRanking).toBe(false);
  });

  it('duelo sem voto nenhum termina indeciso, não travado', async () => {
    const { duel, b } = await duelo('voting');

    const fechamento = await chamada('POST', `/duels/${duel.id}/events`, b.cookie, {
      event: 'voting_closed',
    });

    expect(fechamento.json().duel).toMatchObject({ state: 'result', winner: 'undecided' });
  });

  it('404 em duelo que não existe', async () => {
    const response = await chamada('GET', `/duels/${randomUUID()}`);
    expect(response.statusCode).toBe(404);
  });
});

describe('o duelo visto do estádio', () => {
  it('sai com nome dos dois competidores, não com UUID', async () => {
    const { duel, a, b } = await duelo('running');

    const resposta = await chamada('GET', `/duels/${duel.id}`);
    const { competitors } = resposta.json();

    expect(competitors.a.id).toBe(a.id);
    expect(competitors.b.id).toBe(b.id);
    expect(competitors.a.handle).toMatch(/^criador_a_/);
    expect(competitors.b.handle).toMatch(/^criador_b_/);
  });

  it('não vaza e-mail de quem está duelando', async () => {
    // `publicUser` serve para quem está logado ver a própria conta. O estádio
    // é outra coisa: e-mail e situação de senha não são da plateia.
    const { duel, a } = await duelo('running');
    await prisma.user.update({ where: { id: a.id }, data: { email: 'a@trendi.test' } });

    const { competitors } = (await chamada('GET', `/duels/${duel.id}`)).json();

    expect(competitors.a).toEqual({
      id: a.id,
      handle: expect.stringMatching(/^criador_a_/),
      displayName: null,
      avatarUrl: null,
    });
  });

  it('responde para visitante — assistir não pede conta', async () => {
    const { duel } = await duelo('running');

    const resposta = await chamada('GET', `/duels/${duel.id}`);

    expect(resposta.statusCode).toBe(200);
    expect(resposta.json().duel.state).toBe('running');
    // Visitante não tem voto para lembrar, e não é erro: é visitante.
    expect(resposta.json().voting.yourVote).toBeNull();
  });

  it('não devolve apuração enquanto a votação está aberta', async () => {
    // A regra é do produto: placar que anda ao vivo empurra quem ainda não
    // votou para o lado que está ganhando.
    const { duel } = await duelo('voting');

    const resposta = await chamada('GET', `/duels/${duel.id}`);

    expect(resposta.json().voting.tally).toBeNull();
  });
});

/**
 * O desafio da Fase 1 no duelo (C-10).
 *
 * Antes disto, `challenge_id` e `chosen_duration_s` eram colunas que ninguém
 * preenchia: a plateia julgava sem saber o que estava sendo executado, e a
 * EXECUÇÃO não tinha duração para o relógio (C-40) aplicar.
 */
describe('o desafio do duelo', () => {
  it('entra quando o duelo chega em ESCOLHA', async () => {
    const { duel, a } = await duelo('matched');

    // O ACEITE é instantâneo, então este evento leva direto a ESCOLHA.
    await chamada('POST', `/duels/${duel.id}/events`, a.cookie, { event: 'both_accepted' });

    const gravado = await prisma.duel.findUniqueOrThrow({ where: { id: duel.id } });
    expect(gravado.state).toBe('choosing');
    expect(gravado.challengeId).toBeTruthy();
    // O tempo é a opção do meio do catálogo: nem o mais fácil, nem o mais
    // difícil. Escolher pelo público é a C-19.
    expect(gravado.chosenDurationS).toBe(60);
  });

  it('não entra antes da ESCOLHA', async () => {
    const { duel, a } = await duelo('queued');

    await chamada('POST', `/duels/${duel.id}/events`, a.cookie, { event: 'match_found' });

    const gravado = await prisma.duel.findUniqueOrThrow({ where: { id: duel.id } });
    expect(gravado.challengeId).toBeNull();
  });

  it('sai na rota de leitura, com o que a plateia julga', async () => {
    const { duel, a } = await duelo('matched');
    await chamada('POST', `/duels/${duel.id}/events`, a.cookie, { event: 'both_accepted' });

    const { challenge } = (await chamada('GET', `/duels/${duel.id}`)).json();

    expect(challenge).toMatchObject({ name: 'Aura', durationS: 60 });
    expect(challenge.rules).toMatch(/presença/i);
    // Não é regra que a plataforma faz cumprir (D-21): é a frase que diz à
    // arquibancada o que ela está julgando.
    expect(challenge.judgingCriteria).toMatch(/dominou a tela/i);
  });

  it('vem nulo enquanto o duelo não tem desafio', async () => {
    const { duel } = await duelo('queued');

    expect((await chamada('GET', `/duels/${duel.id}`)).json().challenge).toBeNull();
  });

  it('dá duração à EXECUÇÃO — é o que o relógio da C-40 aplica', async () => {
    const { duel, a } = await duelo('matched');
    await chamada('POST', `/duels/${duel.id}/events`, a.cookie, { event: 'both_accepted' });
    await chamada('POST', `/duels/${duel.id}/events`, a.cookie, { event: 'choice_closed' });
    await chamada('POST', `/duels/${duel.id}/events`, a.cookie, { event: 'preparation_done' });

    const rodando = await prisma.duel.findUniqueOrThrow({ where: { id: duel.id } });
    expect(rodando.state).toBe('running');
    expect(stateDurationMs({ state: 'running', enteredAt: 0, executionMs: rodando.chosenDurationS! * 1000 })).toBe(60_000);
  });
});

