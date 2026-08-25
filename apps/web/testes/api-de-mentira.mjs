import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { WebSocketServer } from 'ws';

/**
 * API de mentira para os testes de navegador (C-04 e C-06).
 *
 * As telas são server components: elas buscam sessão e duelo antes de
 * renderizar, e essa busca sai do servidor do Next — interceptar no navegador
 * não alcançaria. Em vez de subir API, tempo real e Postgres só para abrir
 * uma página, este arquivo responde o mínimo com resposta fixa.
 *
 * O que se verifica no navegador é a tela: captação, estádio, voto e chat. A
 * API de verdade e o servidor de tempo real têm os próprios testes, contra
 * Postgres de verdade e WebSocket de verdade.
 */

const PORTA = Number(process.env.PORTA_API_DE_MENTIRA ?? 3199);
const PORTA_WS = Number(process.env.PORTA_WS_DE_MENTIRA ?? 3198);

const EU = {
  id: 'competidor-a',
  handle: 'leo',
  displayName: 'Leo',
  avatarUrl: null,
  role: 'creator',
  email: 'leo@trendi.test',
  emailVerified: true,
  hasPassword: true,
};

const COMPETIDORES = {
  a: { id: EU.id, handle: 'leo', displayName: 'Leo', avatarUrl: null },
  b: { id: 'competidor-b', handle: 'rival', displayName: 'Rival', avatarUrl: null },
};

const base = {
  creatorA: COMPETIDORES.a.id,
  creatorB: COMPETIDORES.b.id,
  winner: null,
  scoreA: null,
  scoreB: null,
  countsForRanking: false,
  playbackUrl: null,
};

/**
 * Um duelo por situação que a tela precisa saber mostrar.
 *
 * Nenhum tem `playbackUrl`: é o estado real do projeto até `L-19`, e é o que
 * faz o estádio ter de dizer na cara que não há vídeo saindo dali.
 */
const DUELOS = {
  // Aceito é onde a câmera do competidor abre (C-04).
  'duelo-de-teste': { ...base, id: 'duelo-de-teste', state: 'accepted' },
  'duelo-dos-outros': {
    ...base,
    id: 'duelo-dos-outros',
    state: 'accepted',
    creatorA: 'outra',
    creatorB: 'pessoa',
  },
  'duelo-no-ar': { ...base, id: 'duelo-no-ar', state: 'running' },
  'duelo-em-votacao': { ...base, id: 'duelo-em-votacao', state: 'voting' },
  // Este mente de propósito: devolve apuração com a votação aberta, coisa
  // que a API de verdade nunca faz (e tem teste próprio para isso). Serve
  // para a tela provar que **ela** também não mostra placar parcial — sem
  // isso, o teste de navegador passaria mesmo com a regra quebrada.
  'duelo-que-vaza': { ...base, id: 'duelo-que-vaza', state: 'voting' },
  // Este muda de estado durante o teste, para provar a C-38 no navegador.
  'duelo-que-vira': { ...base, id: 'duelo-que-vira', state: 'running' },
  'duelo-decidido': {
    ...base,
    id: 'duelo-decidido',
    state: 'result',
    winner: 'a',
    scoreA: 0.62,
    scoreB: 0.38,
  },
};

/** Votos desta execução: é o que faz a tela reconhecer quem já votou. */
const votos = new Map();

const servidor = createServer(async (requisicao, resposta) => {
  const url = new URL(requisicao.url ?? '/', `http://localhost:${PORTA}`);
  const comSessao = (requisicao.headers.cookie ?? '').includes('trendi_session');
  const responder = (status, corpo) => {
    resposta.writeHead(status, { 'content-type': 'application/json' });
    resposta.end(JSON.stringify(corpo));
  };

  if (url.pathname === '/auth/session') return responder(200, { user: EU });

  if (url.pathname === '/auth/realtime-ticket') {
    if (!comSessao) return responder(401, { error: 'sem_sessao' });
    return responder(200, { ticket: 'ticket-de-mentira', expiresAt: new Date().toISOString() });
  }

  const voto = url.pathname.match(/^\/duels\/([^/]+)\/votes$/);
  if (voto !== null) {
    if (!comSessao) return responder(401, { error: 'sem_sessao' });
    const duelId = voto[1];
    if (votos.has(duelId)) return responder(409, { error: 'ja_votou' });
    votos.set(duelId, JSON.parse(await corpoDe(requisicao)).votedFor);
    return responder(201, { ok: true, stand: 'general' });
  }

  // Sem fornecedor de vídeo — é o que a API real responde até L-19, e o que
  // leva a tela do competidor ao modo local.
  if (url.pathname.endsWith('/publish-credential')) {
    return responder(503, { error: 'video_indisponivel' });
  }

  const duelo = url.pathname.match(/^\/duels\/([^/]+)$/);
  if (duelo !== null) {
    const duel = DUELOS[duelo[1]];
    if (duel === undefined) return responder(404, { error: 'duelo_nao_encontrado' });

    const meuVoto = comSessao ? (votos.get(duel.id) ?? null) : null;
    return responder(200, {
      duel,
      competitors: COMPETIDORES,
      voting: {
        state: duel.state,
        voters: votos.size,
        yourVote: meuVoto,
        // Só no RESULTADO existe apuração. Durante a votação vem nula, de
        // propósito — a tela não pode inventar placar parcial.
        tally:
          duel.state === 'result' || duel.id === 'duelo-que-vaza'
            ? { winner: 'a', shareA: duel.scoreA ?? 0.7, shareB: duel.scoreB ?? 0.3 }
            : null,
      },
    });
  }

  // Só para o teste: vira o estado do duelo e avisa a sala, do mesmo jeito
  // que a API de verdade avisa (pelo Postgres, na C-38). É o que permite
  // provar no navegador que a tela muda sem recarregar.
  const virar = url.pathname.match(/^\/testes\/duels\/([^/]+)\/estado\/([a-z_]+)$/);
  if (virar !== null) {
    const duel = DUELOS[virar[1]];
    if (duel === undefined) return responder(404, { error: 'duelo_nao_encontrado' });
    duel.state = virar[2];
    for (const socket of salas.clients) envie(socket, {
      type: 'state',
      duelId: duel.id,
      state: duel.state,
    });
    return responder(200, { ok: true, state: duel.state });
  }

  responder(404, { error: 'nao_encontrado' });
});

function corpoDe(requisicao) {
  return new Promise((resolve) => {
    let bruto = '';
    requisicao.on('data', (pedaco) => (bruto += pedaco));
    requisicao.on('end', () => resolve(bruto === '' ? '{}' : bruto));
  });
}

/**
 * Tempo real de mentira: fala o protocolo de `@trendi/shared`, e nada mais.
 *
 * O servidor de verdade valida ticket, guarda histórico no Postgres e limita
 * taxa — e tem teste para cada uma dessas coisas. Aqui o que se verifica é a
 * outra ponta: o estádio conectando, recebendo e mandando.
 */
const salas = new WebSocketServer({ port: PORTA_WS });

salas.on('connection', (socket, requisicao) => {
  const url = new URL(requisicao.url ?? '/', `http://localhost:${PORTA_WS}`);
  if (url.searchParams.get('ticket') === null) {
    socket.close(4401, 'ticket inválido');
    return;
  }

  socket.on('message', (bruto) => {
    const mensagem = JSON.parse(String(bruto));

    if (mensagem.type === 'join') {
      envie(socket, {
        type: 'hello',
        duelId: mensagem.duelId,
        state: DUELOS[mensagem.duelId]?.state ?? 'running',
        you: { userId: EU.id, handle: EU.handle, stand: 'general' },
      });
      envie(socket, {
        type: 'history',
        duelId: mensagem.duelId,
        messages: [fala(mensagem.duelId, 'rival', 'boa sorte')],
      });
      return;
    }

    if (mensagem.type === 'message') {
      envie(socket, { type: 'message', message: fala('duelo', EU.handle, mensagem.body) });
    }
  });
});

function fala(duelId, handle, body) {
  return {
    id: randomUUID(),
    duelId,
    userId: handle,
    handle,
    stand: 'general',
    body,
    createdAt: new Date().toISOString(),
  };
}

function envie(socket, mensagem) {
  socket.send(JSON.stringify(mensagem));
}

servidor.listen(PORTA, '127.0.0.1', () => {
  console.log(`api de mentira em http://127.0.0.1:${PORTA}, tempo real em ws://127.0.0.1:${PORTA_WS}`);
});
