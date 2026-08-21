import { randomUUID } from 'node:crypto';
import type { FastifyInstance, InjectOptions } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPrismaClient, createSession, type PrismaClient } from '@trendi/db';
import { startTestDatabase, type TestDatabase } from '@trendi/db/testing';
import { FakeVideoProvider } from '@trendi/video';
import { loadConfig } from '../config.js';
import { buildServer } from '../server.js';
import { SESSION_COOKIE } from '../auth/session-cookie.js';

/**
 * O vídeo acompanhando o ciclo do duelo (C-03).
 *
 * Roda contra o fornecedor falso — o de verdade espera a conta AWS (`L-19`).
 * O que se verifica aqui é o acoplamento: em que estado o palco abre, quando
 * a composição sobe, quando ela cai, e o que acontece se a mídia falhar.
 */

let database: TestDatabase;
let prisma: PrismaClient;
let app: FastifyInstance;
let video: FakeVideoProvider;

const config = loadConfig({ NODE_ENV: 'test', REALTIME_TICKET_SECRET: 'segredo-de-teste' });

beforeAll(async () => {
  database = await startTestDatabase();
  prisma = createPrismaClient(database.connectionString);
  video = new FakeVideoProvider();
  app = buildServer({ prisma, config, video, logger: false });
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
  await database.close();
});

async function pessoa(handle: string) {
  const user = await prisma.user.create({
    data: { id: randomUUID(), handle: `${handle}_${Math.random().toString(36).slice(2, 7)}` },
  });
  const { token } = await createSession(prisma, user.id);
  return { id: user.id, cookie: token };
}

async function duelo(estado: string) {
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

const evento = (duelId: string, cookie: string, event: string) =>
  chamada('POST', `/duels/${duelId}/events`, cookie, { event });

/**
 * Um duelo que chegou ao ACEITE pelo caminho normal.
 *
 * Semear direto no estado não serve: o palco abre na *transição* para
 * ACEITE, não por estar nele. Um duelo posto à força em `accepted` fica sem
 * palco, que é exatamente o bug que este atalho esconderia.
 */
async function dueloAceito() {
  const criado = await duelo('matched');
  await evento(criado.duel.id, criado.a.cookie, 'both_accepted');
  return criado;
}

describe('a mídia acompanha o estado', () => {
  it('abre o palco no aceite, e não antes', async () => {
    const { duel, a } = await duelo('queued');

    await evento(duel.id, a.cookie, 'match_found');
    expect((await prisma.duel.findUniqueOrThrow({ where: { id: duel.id } })).stageId).toBeNull();

    await evento(duel.id, a.cookie, 'both_accepted');
    const depois = await prisma.duel.findUniqueOrThrow({ where: { id: duel.id } });

    expect(depois.stageId).toBeTruthy();
    expect(video.isOpen(depois.stageId!)).toBe(true);
  });

  it('sobe a composição quando o duelo começa a rodar', async () => {
    const { duel, a } = await dueloAceito();
    await evento(duel.id, a.cookie, 'choice_closed');

    const resposta = await evento(duel.id, a.cookie, 'preparation_done');

    expect(resposta.json().duel.state).toBe('running');
    expect(resposta.json().duel.playbackUrl).toContain('.m3u8');
    const gravado = await prisma.duel.findUniqueOrThrow({ where: { id: duel.id } });
    expect(gravado.compositionId).toBeTruthy();
  });

  it('tira do ar quando a votação abre — julga-se o que aconteceu', async () => {
    const { duel, a } = await dueloAceito();
    await evento(duel.id, a.cookie, 'choice_closed');
    await evento(duel.id, a.cookie, 'preparation_done');

    const rodando = await prisma.duel.findUniqueOrThrow({ where: { id: duel.id } });
    expect(rodando.compositionId).toBeTruthy();

    await evento(duel.id, a.cookie, 'execution_done');
    const votando = await prisma.duel.findUniqueOrThrow({ where: { id: duel.id } });

    expect(votando.state).toBe('voting');
    expect(votando.compositionId).toBeNull();
    expect(votando.playbackUrl).toBeNull();
    // A gravação fica: é a matéria-prima do clipe (C-21).
    expect(votando.recordingUrl).toContain('gravacoes');
  });

  it('fecha o palco quando o duelo termina', async () => {
    const { duel, a } = await dueloAceito();
    await evento(duel.id, a.cookie, 'choice_closed');
    await evento(duel.id, a.cookie, 'preparation_done');
    await evento(duel.id, a.cookie, 'execution_done');

    const antes = await prisma.duel.findUniqueOrThrow({ where: { id: duel.id } });
    await evento(duel.id, a.cookie, 'voting_closed');

    expect(video.isOpen(antes.stageId!)).toBe(false);
  });

  it('fecha o palco também quando alguém desiste', async () => {
    const { duel, a } = await dueloAceito();
    await evento(duel.id, a.cookie, 'choice_closed');

    const emEscolha = await prisma.duel.findUniqueOrThrow({ where: { id: duel.id } });
    await evento(duel.id, a.cookie, 'abandon');

    expect(video.isOpen(emEscolha.stageId!)).toBe(false);
  });
});

describe('quando a mídia falha', () => {
  it('a transição acontece assim mesmo — auditoria vale mais que palco', async () => {
    const quebrado = {
      name: 'quebrado',
      createStage: () => Promise.reject(new Error('fornecedor fora do ar')),
      issuePublishCredential: () => Promise.reject(new Error('fora do ar')),
      startComposition: () => Promise.reject(new Error('fora do ar')),
      stopComposition: () => Promise.reject(new Error('fora do ar')),
      closeStage: () => Promise.reject(new Error('fora do ar')),
    };
    const comFalha = buildServer({ prisma, config, video: quebrado, logger: false });
    await comFalha.ready();

    const { duel, a } = await duelo('matched');
    const resposta = await comFalha.inject({
      method: 'POST',
      url: `/duels/${duel.id}/events`,
      cookies: { [SESSION_COOKIE]: a.cookie },
      payload: { event: 'both_accepted' },
    });

    expect(resposta.statusCode).toBe(200);
    // Passou pelo aceite e seguiu, como sempre: a mídia caiu, o duelo não.
    expect(resposta.json().duel.state).toBe('choosing');
    expect(await prisma.duelTransition.count({ where: { duelId: duel.id } })).toBe(2);

    await comFalha.close();
  });
});

describe('credencial de publicação', () => {
  it('sai por lado, para cada competidor', async () => {
    const { duel, a, b } = await dueloAceito();

    const paraA = await chamada('POST', `/duels/${duel.id}/publish-credential`, a.cookie);
    const paraB = await chamada('POST', `/duels/${duel.id}/publish-credential`, b.cookie);

    expect(paraA.json().credential.side).toBe('a');
    expect(paraB.json().credential.side).toBe('b');
    expect(paraA.json().credential.token).not.toBe(paraB.json().credential.token);
  });

  it('não sai para quem não está duelando', async () => {
    const { duel } = await dueloAceito();
    const espectador = await pessoa('espectador');

    const resposta = await chamada(
      'POST',
      `/duels/${duel.id}/publish-credential`,
      espectador.cookie,
    );
    expect(resposta.statusCode).toBe(403);
  });

  it('não sai antes de o palco existir', async () => {
    const { duel, a } = await duelo('queued');

    const resposta = await chamada('POST', `/duels/${duel.id}/publish-credential`, a.cookie);

    expect(resposta.statusCode).toBe(409);
    expect(resposta.json().error).toBe('palco_nao_aberto');
  });

  it('exige sessão', async () => {
    const { duel } = await duelo('accepted');
    const resposta = await chamada('POST', `/duels/${duel.id}/publish-credential`);
    expect(resposta.statusCode).toBe(401);
  });

  it('responde 503 quando o ambiente não tem vídeo configurado', async () => {
    const semVideo = buildServer({ prisma, config, logger: false });
    await semVideo.ready();
    const { duel, a } = await duelo('accepted');

    const resposta = await semVideo.inject({
      method: 'POST',
      url: `/duels/${duel.id}/publish-credential`,
      cookies: { [SESSION_COOKIE]: a.cookie },
    });

    expect(resposta.statusCode).toBe(503);
    await semVideo.close();
  });
});
