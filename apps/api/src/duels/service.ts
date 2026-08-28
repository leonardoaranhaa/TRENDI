import type { Challenge, Duel, PrismaClient, User } from '@trendi/db';
import type { PublishCredential, VideoProvider } from '@trendi/video';
import {
  DUEL_STATE_CHANNEL,
  applyEvent,
  stateDurationMs,
  tallySimpleVote,
  tick,
  type DuelEvent,
  type DuelSnapshot,
  type DuelState,
  type DuelTransition,
  type TransitionResult,
  type Side,
  type SimpleTally,
  type Stand,
} from '@trendi/shared';

/**
 * Serviço de duelo: o que move o estado e o que apura o voto (C-09).
 *
 * A regra de transição mora em `@trendi/shared` e é pura. Aqui é o que a
 * regra não sabe fazer: ler e gravar, e registrar cada passagem em
 * `duel_transitions` — auditoria é requisito, não luxo (convenção 3).
 *
 * Quem move o duelo, nesta fase, são os dois competidores. Timeout automático
 * depende do relógio (C-40); os competidores também movem o duelo clicando,
 * porque alguém clica, que é o "tudo manual" previsto para a Fase 1.
 */

export type DuelProblem =
  | 'duelo_nao_encontrado'
  | 'nao_e_competidor'
  | 'transicao_invalida'
  | 'votacao_fechada'
  | 'ja_votou'
  | 'palco_nao_aberto';

function snapshotOf(duel: Duel): DuelSnapshot {
  return {
    state: duel.state as DuelState,
    enteredAt: duel.stateEnteredAt.getTime(),
    ...(duel.chosenDurationS === null ? {} : { executionMs: duel.chosenDurationS * 1000 }),
  };
}

export interface DuelView {
  readonly id: string;
  readonly state: DuelState;
  readonly creatorA: string;
  readonly creatorB: string;
  readonly winner: string | null;
  readonly scoreA: number | null;
  readonly scoreB: number | null;
  readonly countsForRanking: boolean;
  /** Onde a plateia assiste. Só existe com a composição no ar. */
  readonly playbackUrl: string | null;
}

export function duelView(duel: Duel): DuelView {
  return {
    id: duel.id,
    state: duel.state as DuelState,
    creatorA: duel.creatorA,
    creatorB: duel.creatorB,
    winner: duel.winner,
    scoreA: duel.scoreA === null ? null : Number(duel.scoreA),
    scoreB: duel.scoreB === null ? null : Number(duel.scoreB),
    countsForRanking: duel.countsForRanking,
    playbackUrl: duel.playbackUrl,
  };
}

/**
 * Um competidor como a plateia o vê (C-06).
 *
 * De propósito menor que o `publicUser` do login: e-mail e situação de senha
 * são da conta de quem está logado, não do estádio inteiro.
 */
export interface CompetitorView {
  readonly id: string;
  readonly handle: string;
  readonly displayName: string | null;
  readonly avatarUrl: string | null;
}

/**
 * O desafio como a plateia o vê (C-10).
 *
 * `judgingCriteria` **não é regra que a plataforma faz cumprir** — é a frase
 * que diz à arquibancada o que ela está julgando (D-21). Quem faz cumprir
 * são as três regras de conduta.
 */
export interface ChallengeView {
  readonly name: string;
  readonly rules: string;
  readonly judgingCriteria: string;
  /** Quanto tempo a execução vai durar, em segundos. */
  readonly durationS: number | null;
}

export function challengeView(challenge: Challenge, chosenDurationS: number | null): ChallengeView {
  return {
    name: challenge.name,
    rules: challenge.rules,
    judgingCriteria: challenge.judgingCriteria,
    durationS: chosenDurationS,
  };
}

export function competitorView(user: User): CompetitorView {
  return {
    id: user.id,
    handle: user.handle,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  };
}

/**
 * Aplica um evento no duelo, em nome de um dos competidores.
 *
 * A transição é registrada mesmo quando leva a cancelamento — principalmente
 * quando leva, porque é dela que sai a desistência (regras §5).
 */
export async function applyDuelEvent(
  prisma: PrismaClient,
  duelId: string,
  actorId: string,
  event: DuelEvent,
  now = new Date(),
  video?: VideoProvider,
): Promise<{ duel: DuelView } | { problem: DuelProblem }> {
  const duel = await prisma.duel.findUnique({ where: { id: duelId } });
  if (duel === null) return { problem: 'duelo_nao_encontrado' };
  if (actorId !== duel.creatorA && actorId !== duel.creatorB) return { problem: 'nao_e_competidor' };

  let resultado;
  try {
    resultado = applyEvent(snapshotOf(duel), event, now.getTime());
  } catch {
    return { problem: 'transicao_invalida' };
  }

  try {
    return { duel: await persistirTransicoes(prisma, duel, resultado, now, video) };
  } catch (erro) {
    // O duelo saiu do estado em que estava entre a leitura e a gravação: o
    // evento deste clique já não se aplica ao duelo de agora.
    if (erro instanceof TransicaoPerdida) return { problem: 'transicao_invalida' };
    throw erro;
  }
}

/**
 * Outro alguém moveu o duelo primeiro.
 *
 * Não é erro do sistema: é a corrida sendo perdida, e cada ponto de entrada
 * sabe o que responder — quem clicou recebe "transição inválida", e o
 * relógio simplesmente segue para o próximo duelo.
 */
class TransicaoPerdida extends Error {}

/**
 * Move o duelo porque o **prazo venceu**, não porque alguém clicou (C-40).
 *
 * Sem isto, os prazos escritos em `duel-state.ts` existem e ninguém os
 * aplica: o pior caso é a janela de votação, que nunca fecharia sozinha —
 * e aí quem encerra o julgamento é um dos julgados.
 *
 * Devolve `null` quando não havia nada vencido. Quem chama é o relógio, e
 * ele chama em laço.
 */
export async function tickDuel(
  prisma: PrismaClient,
  duel: Duel,
  now: Date,
  video?: VideoProvider,
): Promise<DuelView | null> {
  const vencida = tick(snapshotOf(duel), now.getTime());
  if (vencida === null) return null;

  try {
    return await persistirTransicoes(prisma, duel, vencida, now, video);
  } catch (erro) {
    // Um clique chegou antes do relógio: o duelo já andou, e está certo.
    if (erro instanceof TransicaoPerdida) return null;
    throw erro;
  }
}

/**
 * O que acontece depois de decidida a primeira passagem.
 *
 * Duas coisas movem o duelo: um competidor clicando (`applyDuelEvent`) e o
 * relógio vencendo (`tickDuel`, C-40). Elas diferem só em **como escolhem a
 * transição** — daí para baixo é idêntico: encadear estados instantâneos,
 * gravar cada passagem, mover a mídia, apurar no RESULTADO e avisar o tempo
 * real.
 *
 * Por isso o corpo é um só. Duplicar deixaria o `pg_notify` e a auditoria em
 * dois lugares, e um dia só um deles seria corrigido.
 */
async function persistirTransicoes(
  prisma: PrismaClient,
  duel: Duel,
  resultado: TransitionResult,
  now: Date,
  video: VideoProvider | undefined,
): Promise<DuelView> {
  const duelId = duel.id;

  // Estado de duração zero anda sozinho. O ACEITE é assim: o arquivo de
  // regras o chama de instantâneo, e ele existe para aparecer na auditoria
  // como ponto de não retorno — não para o duelo ficar parado nele.
  const transitions: DuelTransition[] = [resultado.transition];
  let snapshot = resultado.snapshot;
  for (;;) {
    const automatica = stateDurationMs(snapshot) === 0 ? tick(snapshot, now.getTime()) : null;
    if (automatica === null) break;
    transitions.push(automatica.transition);
    snapshot = automatica.snapshot;
  }

  // Ao chegar em RESULTADO, o placar sai junto: é o mesmo instante para quem
  // está assistindo, e evita duelo em "resultado" sem resultado.
  const apuracao = snapshot.state === 'result' ? await tallyOf(prisma, duelId) : null;

  // O duelo ganha desafio ao entrar em ESCOLHA (C-10). Não há rota de
  // criação de duelo — matchmaking é Fase 2 —, então este é o momento certo:
  // o estado existe para escolher, e a Fase 1 escolhe sozinha porque só há
  // uma categoria. Quem escolhe de verdade é o público, na C-19.
  const desafio =
    transitions.some((passagem) => passagem.to === 'choosing') && duel.challengeId === null
      ? await desafioDaVez(prisma)
      : null;

  // A mídia acompanha o estado: palco no ACEITE, composição na EXECUÇÃO, e
  // tudo desligado quando o duelo sai do ar. Cada passagem conta — inclusive
  // as automáticas, senão o palco do ACEITE nunca abriria. Falha de mídia não
  // trava a transição: o duelo precisa poder ser cancelado com o fornecedor
  // fora do ar.
  let midia: MediaPatch = {};
  if (video !== undefined) {
    for (const passagem of transitions) {
      midia = { ...midia, ...(await moveMedia(video, { ...duel, ...midia }, passagem.to)) };
    }
  }

  const atualizado = await prisma.$transaction(async (tx) => {
    // A gravação só vale se o duelo ainda estiver **exatamente** onde estava
    // quando foi lido. Sem isso, dois competidores clicando ao mesmo tempo —
    // ou o relógio e um clique — gravariam duas passagens para a mesma
    // transição, e auditoria com passagem duplicada é pior que auditoria
    // faltando.
    const { count } = await tx.duel.updateMany({
      where: { id: duelId, state: duel.state, stateEnteredAt: duel.stateEnteredAt },
      data: {
        state: snapshot.state,
        stateEnteredAt: now,
        ...(snapshot.state === 'running' ? { startedAt: now } : {}),
        ...(snapshot.state === 'result' || snapshot.state === 'cancelled' ? { endedAt: now } : {}),
        ...(desafio === null
          ? {}
          : { challengeId: desafio.challengeId, chosenDurationS: desafio.durationS }),
        ...midia,
        ...(apuracao === null
          ? {}
          : {
              winner: apuracao.winner,
              scoreA: apuracao.shareA,
              scoreB: apuracao.shareB,
              countsForRanking: false,
            }),
      },
    });
    if (count === 0) throw new TransicaoPerdida();

    const gravado = await tx.duel.findUniqueOrThrow({ where: { id: duelId } });

    // O aviso ao tempo real sai daqui de dentro, e não depois (C-38).
    //
    // `pg_notify` numa transação só é entregue se ela der certo. Isso torna
    // impossível avisar de uma transição que não aconteceu — garantia que
    // uma chamada HTTP depois do commit não daria, e que importa porque é
    // este aviso que abre a janela de votação na tela de todo mundo.
    //
    // Vai só o estado final: a cadeia automática (ACEITE é instantâneo)
    // renderia três avisos seguidos, e a tela só piscaria.
    await tx.$executeRaw`SELECT pg_notify(${DUEL_STATE_CHANNEL}, ${JSON.stringify({
      duelId,
      state: snapshot.state,
    })})`;

    // Toda passagem vira linha, inclusive as automáticas: auditoria com buraco
    // não é auditoria (convenção 3).
    for (const passagem of transitions) {
      await tx.duelTransition.create({
        data: {
          duelId,
          fromState: passagem.from,
          toState: passagem.to,
          event: passagem.event,
          abandonment: passagem.abandonment,
          occurredAt: now,
          ...(passagem.reason === undefined ? {} : { reason: passagem.reason }),
        },
      });
    }

    return gravado;
  });

  return duelView(atualizado);
}

/**
 * Registra um voto.
 *
 * Uma conta, um voto — garantido pela chave da tabela, não por consulta antes
 * de gravar, que perderia a corrida entre dois cliques.
 *
 * A arquibancada vem da presença: quem escolheu um lado no chat vota como
 * daquele lado. Na Fase 1 isso não muda o peso (é `tallySimpleVote`), mas já
 * fica registrado para a apuração cruzada da Fase 2.
 */
export async function castVote(
  prisma: PrismaClient,
  duelId: string,
  userId: string,
  votedFor: Side,
): Promise<{ stand: Stand } | { problem: DuelProblem }> {
  const duel = await prisma.duel.findUnique({ where: { id: duelId } });
  if (duel === null) return { problem: 'duelo_nao_encontrado' };
  if (duel.state !== 'voting') return { problem: 'votacao_fechada' };

  const presence = await prisma.attendance.findUnique({
    where: { duelId_userId: { duelId, userId } },
  });
  const stand = (presence?.stand ?? 'general') as Stand;

  try {
    await prisma.resultVote.create({ data: { duelId, userId, votedFor, stand } });
  } catch {
    // Chave primária (duelo, usuário) já ocupada: segundo voto da mesma conta.
    return { problem: 'ja_votou' };
  }

  return { stand };
}

export async function tallyOf(prisma: PrismaClient, duelId: string): Promise<SimpleTally> {
  const votes = await prisma.resultVote.findMany({
    where: { duelId },
    select: { votedFor: true, annulled: true },
  });

  return tallySimpleVote(votes.map((vote) => ({ votedFor: vote.votedFor as Side, annulled: vote.annulled })));
}

export interface VoteStatus {
  readonly state: DuelState;
  /** Quantas contas já votaram. Não diz em quem — ver comentário abaixo. */
  readonly voters: number;
  readonly yourVote: Side | null;
  /** A apuração só aparece depois que o duelo chega em RESULTADO. */
  readonly tally: SimpleTally | null;
}

/**
 * O que o cliente pode saber durante a votação.
 *
 * Parcial não sai: placar que anda ao vivo empurra quem ainda não votou para
 * o lado que está ganhando, e o resultado passa a medir a onda em vez do
 * desempenho. O número de votantes sai, porque isso é atmosfera, não placar.
 */
export async function voteStatus(
  prisma: PrismaClient,
  duelId: string,
  userId: string | null,
): Promise<VoteStatus | { problem: DuelProblem }> {
  const duel = await prisma.duel.findUnique({ where: { id: duelId } });
  if (duel === null) return { problem: 'duelo_nao_encontrado' };

  const [voters, meu] = await Promise.all([
    prisma.resultVote.count({ where: { duelId, annulled: false } }),
    userId === null
      ? Promise.resolve(null)
      : prisma.resultVote.findUnique({ where: { duelId_userId: { duelId, userId } } }),
  ]);

  const encerrado = duel.state === 'result';
  return {
    state: duel.state as DuelState,
    voters,
    yourVote: meu === null ? null : (meu.votedFor as Side),
    tally: encerrado ? await tallyOf(prisma, duelId) : null,
  };
}

/**
 * O desafio que o duelo vai executar, e por quanto tempo (C-10).
 *
 * A Fase 1 lança com uma categoria só — Aura / Presença —, então não há o que
 * sortear: é o desafio ativo. O tempo é a **opção do meio** das que o
 * catálogo oferece: escolher pelo público é a C-19, e até lá o meio é o que
 * não distorce — nem o mais fácil, nem o mais difícil.
 *
 * Sem desafio ativo no banco, o duelo anda sem desafio, como andava antes.
 * Ficar preso porque a semente não rodou seria pior do que a tela dizer menos.
 */
async function desafioDaVez(
  prisma: PrismaClient,
): Promise<{ challengeId: string; durationS: number } | null> {
  const desafio = await prisma.challenge.findFirst({ where: { active: true } });
  if (desafio === null) return null;

  const opcoes = desafio.durationOptionsS;
  const meio = opcoes[Math.floor(opcoes.length / 2)];
  if (meio === undefined) return null;

  return { challengeId: desafio.id, durationS: meio };
}

/** O que a mídia precisa virar quando o duelo entra num estado. */
type MediaPatch = {
  stageId?: string | null;
  compositionId?: string | null;
  playbackUrl?: string | null;
  recordingUrl?: string | null;
};

/** O mínimo que a mídia precisa saber do duelo para decidir o que fazer. */
interface MediaState {
  readonly id: string;
  readonly stageId?: string | null;
  readonly compositionId?: string | null;
}

async function moveMedia(
  video: VideoProvider,
  duel: MediaState,
  to: DuelState,
): Promise<MediaPatch> {
  try {
    if (to === 'accepted' && (duel.stageId ?? null) === null) {
      const palco = await video.createStage(duel.id);
      return { stageId: palco.stageId };
    }

    if (to === 'running' && duel.stageId != null && (duel.compositionId ?? null) === null) {
      const composicao = await video.startComposition(duel.stageId);
      return { compositionId: composicao.compositionId, playbackUrl: composicao.playbackUrl };
    }

    // Sai do ar em VOTAÇÃO: o que se julga é o que aconteceu, não o que o
    // competidor faz enquanto a plateia decide.
    if ((to === 'voting' || to === 'result' || to === 'cancelled') && duel.compositionId != null) {
      const gravacao = await video.stopComposition(duel.compositionId);
      const patch: MediaPatch = { compositionId: null, playbackUrl: null };
      if (gravacao !== null) patch.recordingUrl = gravacao.url;
      if (to !== 'voting' && duel.stageId != null) await video.closeStage(duel.stageId);
      return patch;
    }

    if ((to === 'result' || to === 'cancelled') && duel.stageId != null) {
      await video.closeStage(duel.stageId);
    }
  } catch {
    // Silêncio de propósito: registrar a transição importa mais do que
    // desligar o palco. Palco órfão é problema de limpeza; transição perdida
    // é auditoria furada, e a convenção 3 não abre mão dela.
    return {};
  }

  return {};
}

/**
 * Sobe a composição de um duelo que está rodando sem ela (C-05).
 *
 * Isso acontece quando a mídia falha na transição para EXECUÇÃO: a transição
 * segue assim mesmo, porque auditoria vale mais que palco, e o duelo fica no
 * ar **sem ninguém poder assistir**. Não há agendador nesta fase — ele é a
 * C-40 —, então a segunda chance acontece no próximo momento em que alguém
 * bate na API por causa deste duelo, que é o competidor pedindo credencial.
 */
async function garantirComposicao(
  prisma: PrismaClient,
  video: VideoProvider,
  duel: Duel,
): Promise<void> {
  if (duel.state !== 'running') return;
  if (duel.compositionId !== null || duel.stageId === null) return;

  try {
    const composicao = await video.startComposition(duel.stageId);

    // Os dois competidores podem pedir credencial ao mesmo tempo, e o duelo
    // pode ter saído de EXECUÇÃO enquanto a composição subia. Quem perder a
    // corrida desliga o que acabou de ligar: duas composições no ar custam
    // dobrado e entregam dois quadros diferentes para a mesma plateia.
    const { count } = await prisma.duel.updateMany({
      where: { id: duel.id, state: 'running', compositionId: null },
      data: {
        compositionId: composicao.compositionId,
        playbackUrl: composicao.playbackUrl,
      },
    });
    if (count === 0) await video.stopComposition(composicao.compositionId);
  } catch {
    // Mesmo silêncio do `moveMedia`: sem composição o duelo ainda anda, e a
    // credencial que o competidor pediu não depende dela.
  }
}

/**
 * Credencial para um competidor publicar do navegador.
 *
 * Só os dois do duelo pegam credencial, e só depois do ACEITE — antes disso
 * não há palco, e emitir token para quem não vai duelar é abrir porta à toa.
 */
export async function issuePublishCredential(
  prisma: PrismaClient,
  video: VideoProvider,
  duelId: string,
  actorId: string,
): Promise<{ credential: PublishCredential } | { problem: DuelProblem }> {
  const duel = await prisma.duel.findUnique({ where: { id: duelId } });
  if (duel === null) return { problem: 'duelo_nao_encontrado' };
  if (actorId !== duel.creatorA && actorId !== duel.creatorB) return { problem: 'nao_e_competidor' };
  if (duel.stageId === null) return { problem: 'palco_nao_aberto' };

  await garantirComposicao(prisma, video, duel);

  const side: Side = actorId === duel.creatorA ? 'a' : 'b';
  return { credential: await video.issuePublishCredential(duel.stageId, side) };
}
