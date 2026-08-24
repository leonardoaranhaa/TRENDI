import { createServer } from 'node:http';

/**
 * API de mentira para o teste de navegador (C-04).
 *
 * A tela do competidor é server component: ela busca sessão e duelo antes de
 * renderizar, e essa busca sai do servidor do Next — interceptar no navegador
 * não alcançaria. Em vez de subir API e Postgres só para abrir uma página,
 * este servidor responde o mínimo com resposta fixa.
 *
 * O que se verifica no navegador é a captação e a tela. A API de verdade tem
 * os próprios testes, contra Postgres de verdade.
 */

const PORTA = Number(process.env.PORTA_API_DE_MENTIRA ?? 3199);

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

/** Um duelo aceito, que é o estado em que a câmera abre. */
const DUELO = {
  id: 'duelo-de-teste',
  state: 'accepted',
  creatorA: EU.id,
  creatorB: 'competidor-b',
  winner: null,
  scoreA: null,
  scoreB: null,
  countsForRanking: false,
  playbackUrl: null,
};

const servidor = createServer((requisicao, resposta) => {
  const url = new URL(requisicao.url ?? '/', `http://localhost:${PORTA}`);
  const responder = (status, corpo) => {
    resposta.writeHead(status, { 'content-type': 'application/json' });
    resposta.end(JSON.stringify(corpo));
  };

  if (url.pathname === '/auth/session') return responder(200, { user: EU });

  if (url.pathname === `/duels/${DUELO.id}`) {
    return responder(200, {
      duel: DUELO,
      voting: { state: DUELO.state, voters: 0, yourVote: null, tally: null },
    });
  }

  // Duelo de outra pessoa: serve para a tela provar que recusa quem não
  // compete.
  if (url.pathname === '/duels/duelo-dos-outros') {
    return responder(200, {
      duel: { ...DUELO, id: 'duelo-dos-outros', creatorA: 'outra', creatorB: 'pessoa' },
      voting: { state: 'accepted', voters: 0, yourVote: null, tally: null },
    });
  }

  // Sem fornecedor de vídeo — é o que a API real responde até L-19, e o que
  // leva a tela ao modo local.
  if (url.pathname.endsWith('/publish-credential')) {
    return responder(503, { error: 'video_indisponivel' });
  }

  responder(404, { error: 'nao_encontrado' });
});

servidor.listen(PORTA, '127.0.0.1', () => {
  console.log(`api de mentira em http://127.0.0.1:${PORTA}`);
});
